const { LRUCache } = require("lru-cache");

const cache = new LRUCache({

    max: 1000,

    ttl: 1000 * 60 * 30
});


function createKey(data) {

    return JSON.stringify({

        gp_id: data.gp_id,

        language: data.language,

        audience: data.audience,

        crop: data.crop,

        temperature:
            Number(data.weather.temperature.toFixed(1)),

        humidity:
            Number(data.weather.humidity.toFixed(1)),

        rainfall:
            Number(data.weather.rainfall.toFixed(1)),

        forecast_rainfall:
            Number(
                data.weather.forecast_rainfall.toFixed(1)
            ),

        wind_speed:
            Number(
                data.weather.wind_speed.toFixed(1)
            )
    });
}


module.exports = {
    cache,
    createKey
};