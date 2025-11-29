const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler'); 

const app = express();

app.use(cors());
app.use(express.json());

// ROUTES
app.use('/api', routes);

// basic health check
app.get('/', (req, res) => res.json({ ok: true }));

// ERROR HANDLER
app.use(errorHandler); 

module.exports = app;