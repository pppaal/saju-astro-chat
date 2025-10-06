# 파일: server.py
from flask import Flask, request, jsonify
import ephem
import math

app = Flask(__name__)
SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

def format_degree(rad):
    deg = math.degrees(rad)
    if deg < 0: deg += 360
    sign_index = int(deg / 30)
    deg_in_sign = deg - (sign_index * 30)
    d = int(deg_in_sign)
    m = int((deg_in_sign - d) * 60)
    return f"{SIGNS[sign_index]} {d}°{str(m).zfill(2)}′"

@app.route('/calculate', methods=['POST'])
def calculate_chart():
    try:
        data = request.get_json()
        observer = ephem.Observer()
        observer.lon, observer.lat = str(data['longitude']), str(data['latitude'])
        local_time = f"{data['year']}/{data['month']}/{data['date']} {data['hour']}:{data['minute']}"
        observer.date = ephem.Date(local_time) - 9 * ephem.hour # 한국 시간 UTC+9

        ecl = ephem.Ecliptic(observer.date)
        lst_rad = observer.sidereal_time()
        y = -math.sin(lst_rad) * math.cos(ecl.obliquity) + math.tan(observer.lat) * math.sin(ecl.obliquity)
        x = math.cos(lst_rad)
        asc_rad = math.atan2(y, x)

        sun = ephem.Sun(observer)
        moon = ephem.Moon(observer)

        return jsonify({
            "sun": format_degree(sun.elong),
            "moon": format_degree(moon.elong),
            "ascendant": format_degree(asc_rad)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)