function evaluateWeather(data) {

    const {
        temperature,
        humidity,
        rainfall,
        wind_speed,
        forecast_rainfall = rainfall,
        soil_moisture = null,
        forecast_hours: forecastHours = 24
    } = data;

    const risks = [];

    function addRisk(
        code,
        severity,
        score,
        reason,
        values = {}
    ) {
        risks.push({
            code,
            severity,
            score,
            reason,
            values
        });
    }


    // ============================================
    // HEAT
    // ============================================

    if (temperature >= 40) {

        addRisk(
            "HEAT_STRESS",
            "CRITICAL",
            0.95,
            "Temperature is at or above 40°C.",
            { temperature }
        );

    } else if (temperature >= 35) {

        addRisk(
            "HEAT_STRESS",
            "HIGH",
            0.85,
            "Temperature is at or above 35°C.",
            { temperature }
        );
    }


    // ============================================
    // HEAVY RAIN
    // ============================================

    if (forecast_rainfall >= 64) {

        addRisk(
            "HEAVY_RAIN",
            "CRITICAL",
            0.96,
            "Forecast rainfall is at or above 64 mm.",
            { rainfall: forecast_rainfall }
        );

    } else if (forecast_rainfall >= 35) {

        addRisk(
            "HEAVY_RAIN",
            "HIGH",
            0.88,
            "Forecast rainfall is at or above 35 mm.",
            { rainfall: forecast_rainfall }
        );

    } else if (forecast_rainfall >= 20) {

        addRisk(
            "HEAVY_RAIN",
            "MEDIUM",
            0.65,
            "Moderate-to-heavy rainfall is forecast.",
            { rainfall: forecast_rainfall }
        );
    }


    // ============================================
    // WIND
    // ============================================

    if (wind_speed >= 60) {

        addRisk(
            "STRONG_WIND",
            "CRITICAL",
            0.97,
            "Wind speed is at or above 60 km/h.",
            { wind_speed }
        );

    } else if (wind_speed >= 40) {

        addRisk(
            "STRONG_WIND",
            "HIGH",
            0.87,
            "Wind speed is at or above 40 km/h.",
            { wind_speed }
        );

    } else if (wind_speed >= 25) {

        addRisk(
            "STRONG_WIND",
            "MEDIUM",
            0.65,
            "Wind speed may affect sensitive agricultural activities.",
            { wind_speed }
        );
    }


    // ============================================
    // HUMIDITY
    // ============================================

    if (humidity >= 90) {

        addRisk(
            "HIGH_HUMIDITY",
            "HIGH",
            0.90,
            "Relative humidity is at or above 90%.",
            { humidity }
        );

    } else if (humidity >= 80) {

        addRisk(
            "HIGH_HUMIDITY",
            "MEDIUM",
            0.72,
            "Relative humidity is high.",
            { humidity }
        );
    }


    // ============================================
    // FUNGAL RISK
    // ============================================

    if (
        humidity >= 85 &&
        temperature >= 18 &&
        temperature <= 32 &&
        forecast_rainfall >= 5
    ) {

        addRisk(
            "FUNGAL_RISK",
            "HIGH",
            0.88,
            "High humidity, suitable temperature and rainfall create weather conditions favorable for fungal development.",
            {
                humidity,
                temperature,
                rainfall: forecast_rainfall
            }
        );
    }


    // ============================================
    // SPRAYING
    // ============================================

    if (
        wind_speed >= 20 ||
        forecast_rainfall >= 5
    ) {

        addRisk(
            "SPRAYING_UNFAVORABLE",
            "MEDIUM",
            0.78,
            "Rainfall or wind conditions may reduce spraying effectiveness.",
            {
                wind_speed,
                rainfall: forecast_rainfall
            }
        );
    }


    // ============================================
    // EXCESS MOISTURE
    // ============================================

    if (
        soil_moisture !== null &&
        soil_moisture >= 80 &&
        forecast_rainfall >= 10
    ) {

        addRisk(
            "EXCESS_MOISTURE",
            "HIGH",
            0.86,
            "High soil moisture combined with additional rainfall increases excess-moisture risk.",
            {
                soil_moisture,
                rainfall: forecast_rainfall
            }
        );
    }


    // ============================================
    // LOW RAINFALL
    // ============================================

    if (forecast_rainfall <= 2) {

        addRisk(
            "LOW_RAINFALL",
            "MEDIUM",
            0.60,
            "Very little rainfall is forecast.",
            {
                rainfall: forecast_rainfall
            }
        );
    }


    // ============================================
    // LOW TEMPERATURE
    // ============================================

    if (temperature <= 5) {

        addRisk(
            "FROST_RISK",
            "HIGH",
            0.90,
            "Temperature is at or below 5°C.",
            {
                temperature
            }
        );
    }


    // ============================================
    // SORT RISKS
    // ============================================

    risks.sort((a, b) => {

        const severityWeight = {
            CRITICAL: 4,
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1
        };

        return (
            severityWeight[b.severity] -
            severityWeight[a.severity]
        ) || (b.score - a.score);
    });


    return {
        detected: risks.length > 0,
        risks,
        primaryRisk: risks[0] || null,
        evaluatedAt: new Date().toISOString(),
        forecastHours
    };
}


module.exports = {
    evaluateWeather
};
