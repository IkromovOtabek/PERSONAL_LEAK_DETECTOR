"""add is_one_time and is_used to secure_files

Revision ID: 001_add_is_one_time_and_is_used
Revises: 
Create Date: 2025-01-11 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_add_is_one_time_and_is_used'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if columns already exist before adding them
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('secure_files')]
    
    # Add is_one_time column if it doesn't exist
    if 'is_one_time' not in columns:
        op.add_column('secure_files', sa.Column('is_one_time', sa.Boolean(), nullable=True, server_default='1'))
        # Update existing rows
        op.execute("UPDATE secure_files SET is_one_time = 1 WHERE is_one_time IS NULL")
        # Make column NOT NULL after setting defaults
        op.alter_column('secure_files', 'is_one_time', nullable=False, server_default='1')
    
    # Add is_used column if it doesn't exist
    if 'is_used' not in columns:
        op.add_column('secure_files', sa.Column('is_used', sa.Boolean(), nullable=True, server_default='0'))
        # Update existing rows
        op.execute("UPDATE secure_files SET is_used = 0 WHERE is_used IS NULL")
        # Make column NOT NULL after setting defaults
        op.alter_column('secure_files', 'is_used', nullable=False, server_default='0')
    
    # Create index on is_used for faster queries (if it doesn't exist)
    indexes = [idx['name'] for idx in inspector.get_indexes('secure_files')]
    if 'ix_secure_files_is_used' not in indexes:
        op.create_index(op.f('ix_secure_files_is_used'), 'secure_files', ['is_used'], unique=False)


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f('ix_secure_files_is_used'), table_name='secure_files')
    
    # Drop columns
    op.drop_column('secure_files', 'is_used')
    op.drop_column('secure_files', 'is_one_time')

