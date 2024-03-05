const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Redis = require('redis');

const DEFAULT_EXPIRATION = 3600;

// define client
const redisClient = Redis.createClient({
    legacyMode: true,
    PORT: 5001
});

// Activate Client
redisClient.on('error', (err) => {
    console.error('Redis Error:', err);
});

// connect client
redisClient.connect().catch(console.error)



const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cors());


// caching using redis
app.get("/api/v1/photos", async (req, res) => {
    const albumId = req.query.albumId;
    const photos = await getOrSetCachePhotos(`photos?albumId=${albumId}`, async () => {
        const { data } = await axios.get(
            "https://jsonplaceholder.typicode.com/photos",
            {
                params: {
                    albumId
                }
            }
        )
        return data;
    })

    res.json(photos);
})

app.get("/api/v1/photos/:id", async (req, res) => {
    const photo = getOrSetCachePhotos(`photos:${req.params.id}`, async () => {
        const { data } = await axios.get(`https://jsonplaceholder.typicode.com/photos/${req.params.id}`)
        return data;
    })
    res.json(photo);
});


function getOrSetCachePhotos(key, cb) {
    return new Promise((resolve, reject) => {
        redisClient.get(key, async (err, data) => {
            // logic for cache miss
            if(err) return reject(err);
            if(data!=null) return resolve(JSON.parse(data));
            // logic for cache miss
            const freshdata = await cb();
            redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshdata))
            resolve(freshdata);
        })
    })
}

const PORT = "8080";

app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
})