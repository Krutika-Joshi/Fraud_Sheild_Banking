from flask import Flask, request, jsonify
import joblib
import os

app = Flask(__name__)

# Load trained model
model = joblib.load("fraud_model.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json

    # Extract features
    features = [
    data.get("amount", 0),
    int(data.get("isNewIP", 0)),
    data.get("transactionCount", 0),
    data.get("timeGap", 0)
]

    # Prediction
    prediction = model.predict([features])[0]
    probability = model.predict_proba([features])[0][1]

    return jsonify({
        "fraud": bool(prediction),
        "riskScore": round(probability, 2)
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)