import json
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, Request, Response, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.campaign import CampaignSendJob, MessageDeliveryEvent

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.get("/whatsapp")
async def verify_whatsapp_webhook(
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge"),
):
    """
    Meta WhatsApp Cloud API webhook verification handshake.
    """
    if mode == "subscribe" and token == settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Webhook verification token mismatch")


@router.post("/whatsapp")
async def process_whatsapp_events(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Processes real delivery status callbacks from Meta WhatsApp Cloud API:
    - sent, delivered, read, failed
    - Updates CampaignSendJob status and records MessageDeliveryEvent
    """
    payload: Dict[str, Any] = await request.json()
    now = datetime.now(timezone.utc)

    # WhatsApp Cloud webhook schema: entry -> changes -> value -> statuses
    entries = payload.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            statuses = value.get("statuses", [])
            for st in statuses:
                msg_id = st.get("id")
                event_status = st.get("status")  # sent, delivered, read, failed

                if msg_id:
                    stmt = select(CampaignSendJob).where(
                        CampaignSendJob.provider_message_id == msg_id
                    )
                    res = await db.execute(stmt)
                    job = res.scalar_one_or_none()
                    if job:
                        if event_status in {"delivered", "read"}:
                            job.status = "delivered"
                            job.delivered_at = now
                        elif event_status == "failed":
                            job.status = "failed"
                            errors = st.get("errors", [{}])
                            job.error_message = errors[0].get("message", "Delivery failed")

                        job.updated_at = now

                        # Log delivery event
                        event = MessageDeliveryEvent(
                            send_job_id=job.id,
                            provider="whatsapp_cloud",
                            event_type=event_status,
                            raw_payload=json.dumps(st),
                            created_at=now,
                        )
                        db.add(event)

    await db.commit()
    return {"status": "ok"}


@router.api_route("/sms/dlr", methods=["GET", "POST"])
@router.api_route("/sms-delivery-report", methods=["GET", "POST"])
async def process_sms_delivery_receipt(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Processes SMS delivery receipt (DLR) callback from Fast2SMS, MSG91, or TRAI DLT gateways.
    Supports both JSON POST payloads and URL query string callbacks.
    """
    data = {}
    if request.method == "POST":
        try:
            data = await request.json()
        except Exception:
            try:
                form = await request.form()
                data = dict(form)
            except Exception:
                data = {}
    else:
        data = dict(request.query_params)

    msg_id = (
        data.get("request_id")
        or data.get("message_id")
        or data.get("requestId")
        or data.get("id")
    )
    dlr_status = (
        data.get("status")
        or data.get("dlr_status")
        or data.get("delivery_status")
        or ""
    ).lower()

    if msg_id:
        stmt = select(CampaignSendJob).where(
            CampaignSendJob.provider_message_id == str(msg_id)
        )
        res = await db.execute(stmt)
        job = res.scalar_one_or_none()
        if job:
            now = datetime.now(timezone.utc)
            if dlr_status in {"delivered", "success", "1", "d"}:
                job.status = "delivered"
                job.delivered_at = now
            elif dlr_status in {"failed", "rejected", "undelivered", "0", "f"}:
                job.status = "failed"
                job.error_message = str(data.get("reason") or data.get("cause") or "SMS DLT Delivery Failed")

            job.updated_at = now
            event = MessageDeliveryEvent(
                send_job_id=job.id,
                provider="sms_gateway",
                event_type=dlr_status,
                raw_payload=json.dumps(data),
                created_at=now,
            )
            db.add(event)
            await db.commit()

    return {"status": "receipt_acknowledged", "received_id": msg_id, "status_recorded": dlr_status}

