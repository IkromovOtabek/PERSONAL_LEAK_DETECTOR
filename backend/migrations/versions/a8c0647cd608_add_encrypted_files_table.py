"""Add encrypted_files table

Revision ID: a8c0647cd608
Revises: 001_add_is_one_time_and_is_used
Create Date: 2025-11-26 00:55:16.634960

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'a8c0647cd608'
down_revision = '001_add_is_one_time_and_is_used'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if table already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'encrypted_files' not in tables:
        # Create encrypted_files table
        op.create_table(
            'encrypted_files',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('original_filename', sa.String(length=255), nullable=False),
            sa.Column('encrypted_filename', sa.String(length=255), nullable=False),
            sa.Column('file_size', sa.BigInteger(), nullable=False),
            sa.Column('mime_type', sa.String(length=100), nullable=True),
            sa.Column('encrypted_data', sa.LargeBinary(), nullable=True),
            sa.Column('download_token', sa.String(length=255), nullable=False),
            sa.Column('access_code_hash', sa.String(length=255), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('max_downloads', sa.Integer(), nullable=True, server_default='1'),
            sa.Column('download_count', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('is_one_time', sa.Boolean(), nullable=True, server_default='1'),
            sa.Column('is_used', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('is_expired', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('upload_completed', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('storage_type', sa.String(length=20), nullable=True, server_default='local'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        
        # Create indexes
        indexes = [idx['name'] for idx in inspector.get_indexes('encrypted_files') if 'encrypted_files' in idx['name']]
        if 'ix_encrypted_files_user_id' not in indexes:
            op.create_index(op.f('ix_encrypted_files_user_id'), 'encrypted_files', ['user_id'], unique=False)
        if 'ix_encrypted_files_download_token' not in indexes:
            op.create_index(op.f('ix_encrypted_files_download_token'), 'encrypted_files', ['download_token'], unique=True)
        if 'ix_encrypted_files_expires_at' not in indexes:
            op.create_index(op.f('ix_encrypted_files_expires_at'), 'encrypted_files', ['expires_at'], unique=False)
        if 'ix_encrypted_files_is_used' not in indexes:
            op.create_index(op.f('ix_encrypted_files_is_used'), 'encrypted_files', ['is_used'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_encrypted_files_is_used'), table_name='encrypted_files')
    op.drop_index(op.f('ix_encrypted_files_expires_at'), table_name='encrypted_files')
    op.drop_index(op.f('ix_encrypted_files_download_token'), table_name='encrypted_files')
    op.drop_index(op.f('ix_encrypted_files_user_id'), table_name='encrypted_files')
    
    # Drop table
    op.drop_table('encrypted_files')
