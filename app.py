from flask import Flask, jsonify, render_template
import mysql.connector
from config import DATABASE

app = Flask(__name__)

def get_measures():
    try:
        connection = mysql.connector.connect(
            host=DATABASE['host'],
            user=DATABASE['user'],
            password=DATABASE['password'],
            database=DATABASE['database']
        )
        cursor = connection.cursor(dictionary=True)

        query_select = """
        SELECT id, x, y, angle, distance_obstacle, 
               vitesse_droit, vitesse_gauche, date_heure
        FROM mesures
        WHERE tag = FALSE OR tag IS NULL
        ORDER BY date_heure ASC;
        """
        cursor.execute(query_select)
        measures = cursor.fetchall()

        if measures:
            ids = [str(measure['id']) for measure in measures]
            if ids:
                query_update = "UPDATE mesures SET tag = TRUE WHERE id IN ({})".format(", ".join(["%s"] * len(ids)))
                cursor.execute(query_update, ids)
                connection.commit()

        return measures

    except mysql.connector.Error as err:
        print(f" Erreur MySQL : {err}")
        return []

    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'connection' in locals() and connection:
            connection.close()

@app.route('/data')
def data():
    measures = get_measures()
    return jsonify(measures)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
