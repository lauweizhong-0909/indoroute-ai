from apps.api.db.database import engine
from apps.api.db import models

print("Connecting to Neon and creating tables...")
models.Base.metadata.create_all(bind=engine)
print("✅ Tables created! You can now run the seed script.")