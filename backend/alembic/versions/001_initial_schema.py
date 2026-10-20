"""Initial Kaveri Member Club Schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-20 16:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Members
    op.create_table(
        'members',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('member_number', sa.String(length=20), nullable=False),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('primary_phone', sa.String(length=20), nullable=False),
        sa.Column('alt_phone', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='active', nullable=False),
        sa.Column('loyalty_points', sa.Integer(), server_default='50', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_members_member_number'), 'members', ['member_number'], unique=True)
    op.create_index(op.f('ix_members_primary_phone'), 'members', ['primary_phone'], unique=True)

    # 2. Marketing Consents
    op.create_table(
        'marketing_consents',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('channel', sa.String(length=20), nullable=False),
        sa.Column('consent_state', sa.String(length=20), server_default='never_given', nullable=False),
        sa.Column('source', sa.String(length=50), server_default='registration_web', nullable=False),
        sa.Column('notice_version', sa.String(length=50), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('withdrawn_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('member_id', 'channel', name='uq_member_channel_consent'),
    )
    op.create_index(op.f('ix_marketing_consents_member_id'), 'marketing_consents', ['member_id'], unique=False)

    # 3. Consent Audit Logs
    op.create_table(
        'consent_audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('channel', sa.String(length=20), nullable=False),
        sa.Column('previous_state', sa.String(length=20), nullable=True),
        sa.Column('new_state', sa.String(length=20), nullable=False),
        sa.Column('action_source', sa.String(length=50), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('notice_version', sa.String(length=50), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_consent_audit_logs_member_id'), 'consent_audit_logs', ['member_id'], unique=False)

    # 4. Admin Users
    op.create_table(
        'admin_users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), server_default='staff', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('must_change_password', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_admin_users_email'), 'admin_users', ['email'], unique=True)
    op.create_index(op.f('ix_admin_users_username'), 'admin_users', ['username'], unique=True)

    # 5. Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('admin_username', sa.String(length=50), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(length=50), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['admin_id'], ['admin_users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 6. Campaigns
    op.create_table(
        'campaigns',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('purpose', sa.String(length=255), nullable=False),
        sa.Column('campaign_type', sa.String(length=50), nullable=False),
        sa.Column('channel', sa.String(length=20), nullable=False),
        sa.Column('message_template', sa.Text(), nullable=False),
        sa.Column('offer_details', sa.Text(), nullable=True),
        sa.Column('discount_pct', sa.Float(), nullable=True),
        sa.Column('terms', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=30), server_default='draft', nullable=False),
        sa.Column('target_filter', sa.Text(), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('executed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('approved_by_id', sa.Integer(), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['approved_by_id'], ['admin_users.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['admin_users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # 7. Campaign Send Jobs
    op.create_table(
        'campaign_send_jobs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('channel', sa.String(length=20), nullable=False),
        sa.Column('recipient_phone', sa.String(length=20), nullable=False),
        sa.Column('idempotency_key', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=30), server_default='pending', nullable=False),
        sa.Column('provider_message_id', sa.String(length=100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('dispatched_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_campaign_send_jobs_campaign_id'), 'campaign_send_jobs', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_campaign_send_jobs_idempotency_key'), 'campaign_send_jobs', ['idempotency_key'], unique=True)
    op.create_index(op.f('ix_campaign_send_jobs_member_id'), 'campaign_send_jobs', ['member_id'], unique=False)

    # 8. Message Delivery Events
    op.create_table(
        'message_delivery_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('send_job_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('raw_payload', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['send_job_id'], ['campaign_send_jobs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_message_delivery_events_send_job_id'), 'message_delivery_events', ['send_job_id'], unique=False)

    # 9. Loyalty Transactions
    op.create_table(
        'loyalty_transactions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('points', sa.Integer(), nullable=False),
        sa.Column('transaction_type', sa.String(length=50), nullable=False),
        sa.Column('reference_id', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_loyalty_transactions_member_id'), 'loyalty_transactions', ['member_id'], unique=False)


def downgrade() -> None:
    op.drop_table('loyalty_transactions')
    op.drop_table('message_delivery_events')
    op.drop_table('campaign_send_jobs')
    op.drop_table('campaigns')
    op.drop_table('audit_logs')
    op.drop_table('admin_users')
    op.drop_table('consent_audit_logs')
    op.drop_table('marketing_consents')
    op.drop_table('members')
