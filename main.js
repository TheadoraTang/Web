const express = require('express');
const mysql = require('mysql');
const path = require('path');
const moment = require('moment');

const app = express();

app.use(express.static('public'));

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'tangxiaohui',
    database: 'web'
};

// Create a database connection pool
const pool = mysql.createPool(dbConfig);

// Define a route for serving the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Define a route for handling search requests
app.get('/search', (req, res) => {
    const keyword = req.query.keyword;

    // Query the database for news matching the keyword
    const sql = `
    SELECT title, publish_date, author, keywords, url, source_name
    FROM fetches
    WHERE keywords LIKE '%${keyword}%'
  `;

    pool.query(sql, (error, results) => {
        if (error) {
            console.error('Error executing database query:', error);
            res.status(500).json({ error: 'An error occurred' });
            return;
        }

        const formattedResults = results.map(news => ({
            ...news,
            publish_date: moment(news.publish_date).format('YYYY-MM-DD'),
        }));

        // Send the search results as JSON response
        res.json(formattedResults);
    });
});

// Define a route for handling keyword frequency requests
app.get('/keyword-frequency', (req, res) => {
    const keyword = req.query.keyword;

    // Query the database for keyword frequency over time
    const sql = `
    SELECT DATE(publish_date) AS date, COUNT(*) AS frequency
    FROM fetches
    WHERE keywords LIKE '%${keyword}%'
    GROUP BY DATE(publish_date)
    ORDER BY DATE(publish_date) ASC
  `;

    pool.query(sql, (error, results) => {
        if (error) {
            console.error('Error executing database query:', error);
            res.status(500).json({ error: 'An error occurred' });
            return;
        }

        const keywordFrequency = results.map(result => ({
            date: moment(result.date).format('YYYY-MM-DD'),
            frequency: result.frequency
        }));

        // Send the keyword frequency data as JSON response
        res.json(keywordFrequency);
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});
