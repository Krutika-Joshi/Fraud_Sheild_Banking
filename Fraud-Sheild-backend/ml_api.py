from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)

# Load trained model
model = joblib.load("fraud_model.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json

    # Extract features
    features = [
        data["amount"],
        int(data["isNewIP"]),
        data["transactionCount"],
        data["timeGap"]
    ]

    # Prediction
    prediction = model.predict([features])[0]
    probability = model.predict_proba([features])[0][1]

    return jsonify({
        "fraud": bool(prediction),
        "riskScore": round(probability, 2)
    })

if __name__ == "__main__":
    app.run(port=8000)