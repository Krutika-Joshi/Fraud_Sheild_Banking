import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

# 📊 Sample dataset (you can improve later)
data = {
    "amount": [100, 200, 50000, 60000, 150, 70000],
    "isNewIP": [0, 0, 1, 1, 0, 1],
    "transactionCount": [1, 1, 3, 4, 1, 5],
    "timeGap": [60, 120, 5, 3, 200, 2],
    "fraud": [0, 0, 1, 1, 0, 1]
}

# Convert to DataFrame
df = pd.DataFrame(data)

# Features and label
X = df.drop("fraud", axis=1)
y = df["fraud"]

# Train model
model = RandomForestClassifier()
model.fit(X, y)

# Save model
joblib.dump(model, "fraud_model.pkl")

print("Model trained and saved successfully!")