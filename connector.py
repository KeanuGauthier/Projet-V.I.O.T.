from flask import Flask, request, jsonify
import mysql.connector
import uuid
from datetime import datetime

app = Flask(__name__)

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="root",
    database="robot_data"
)
cursor = db.cursor()

def clear_database():
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    cursor.execute("TRUNCATE TABLE mesures;")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    db.commit()

clear_database()

@app.route('/data', methods=['POST'])
def receive_data():
    data = request.json
    measure_id = str(uuid.uuid4())
    date_heure = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    tag = data.get("tag", False)

    sql = """
    INSERT INTO mesures (id, date_heure, x, y, angle, vitesse_droit, vitesse_gauche, distance_obstacle, tag)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    values = (
        measure_id, date_heure,
        data["x"], data["y"], data["angle"],
        data["vitesse_moteur_droit"], data["vitesse_moteur_gauche"],
        data["distance_obstacle"], tag
    )

    cursor.execute(sql, values)
    db.commit()
    return jsonify({"status": "success", "id": measure_id}), 200

@app.route('/data', methods=['GET'])
def get_data():
    cursor.execute("SELECT * FROM mesures ORDER BY date_heure DESC LIMIT 10")
    rows = cursor.fetchall()
    data = [
        {"id": row[0], "date_heure": row[1], "x": row[2], "y": row[3], "angle": row[4],
         "vitesse_droit": row[5], "vitesse_gauche": row[6], "distance_obstacle": row[7], "tag": bool(row[8])}
        for row in rows
    ]
    return jsonify(data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
