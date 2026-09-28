import express from 'express';
import "dotenv/config";
import proxy from 'express-http-proxy';

const app = express();
const PORT = process.env.PORT || 8000;

app.use("/auth", proxy(process.env.AUTH_SERVICE));

app.listen(PORT, () => {
    console.log(`Gateway is running on port: ${PORT}`);
});
