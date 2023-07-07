const fs = require('fs');
const mysql = require('mysql');
const requestLib = require('request');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const moment = require('moment');

require('date-utils');

const url_reg = /ent\/article\/([a-zA-Z0-9]{16}).html/;

const seedURL_format = "$('a')";
const keywords_format = " $('meta[name=\"keywords\"]').eq(0).attr(\"content\")";
const source_format = " $('meta[name=\"Copyright\"]').eq(0).attr(\"content\")";
const title_format = " $('meta[name=\"description\"]').eq(0).attr(\"content\")";
const date_format = "$('.post_info').text().match(/(\\d{4})-(\\d{2})-(\\d{2})/)[0]\n";
const author_format = "$('meta[property=\"article:author\"]').eq(0).attr(\"content\")";
const desc_format = " $('meta[name=\"description\"]').eq(0).attr(\"content\")";
const content_format = "$('.post_body').text()";

const source_name = "网易娱乐";
const domain = 'https://ent.163.com/';
const myEncoding = "utf-8";
const seedURL = 'https://ent.163.com/';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36',
};

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'tangxiaohui',
    database: 'web',
};

// Create a database connection
const connection = mysql.createConnection(dbConfig);

// Connect to the database
connection.connect();

function makeRequest(url, callback) {
    const options = {
        url: url,
        encoding: null,
        headers: headers,
        timeout: 10000,
    };
    requestLib(options, callback);
}

function checkURLExistence(url, callback) {
    const sql = 'SELECT COUNT(*) AS count FROM fetches WHERE url = ?';
    connection.query(sql, [url], function (error, results, fields) {
        if (error) throw error;
        const count = results[0].count;
        callback(count > 0);
    });
}

function seedget() {
    makeRequest(seedURL, function (err, res, body) {
        if (body === undefined) return;
        const html = iconv.decode(body, myEncoding);
        const $ = cheerio.load(html, { decodeEntities: true });
        const seedurl_news = eval(seedURL_format);
        seedurl_news.each(function (i, e) {
            let myURL = "";
            try {
                const href = $(e).attr("href");
                if (href === undefined) return;
                if (href.toLowerCase().startsWith('http://') || href.toLowerCase().startsWith('https://')) myURL = href;
                else if (href.startsWith('//')) myURL = 'https:' + href;
                //else myURL = domain + href;
                else myURL = seedURL.substr(0, seedURL.lastIndexOf('/') + 1) + href;
            } catch (e) {
                console.log('识别种子页面中的新闻链接出错：' + e);
            }

            if (!url_reg.test(myURL)) return;
            newsGet(myURL);
        });
    });
}

function newsGet(myURL) {
    checkURLExistence(myURL, function (urlExists) {
        if (urlExists) {
            console.log('URL already exists, skipping: ' + myURL);
            return;
        }

        makeRequest(myURL, function (err, res, body) {
            if (body === undefined) {
                console.error('Response body is empty');
                return;
            }
            const html_news = iconv.decode(body, myEncoding);
            const $ = cheerio.load(html_news, { decodeEntities: true });

            console.log("转码读取成功: " + myURL);

            const fetch = {};
            fetch.title = "";
            fetch.content = "";
            fetch.publish_date = ""
            fetch.url = myURL;
            fetch.source_name = source_name;
            fetch.source_encoding = myEncoding;
            fetch.crawltime = new Date();


            if (keywords_format == "") fetch.keywords = source_name;
            else fetch.keywords = eval(keywords_format);

            if (title_format == "") fetch.title = "";
            else fetch.title = eval(title_format);

            if (date_format == "") fetch.publish_date = date_format
            else fetch.publish_date = eval(date_format)

            if (author_format == "") fetch.author = source_name;
            else fetch.author = eval(author_format);

            if (content_format == "") fetch.content = "";
            else fetch.content = eval(content_format).replace("\r\n" + fetch.author, "");

            if (source_format == "") fetch.source = fetch.source_name;
            else fetch.source = eval(source_format).replace("\r\n", "");

            if (desc_format == "") fetch.desc = fetch.title;
            else {
                if (eval(desc_format) != null) fetch.desc = eval(desc_format).replace("\r\n", "");
            }

            // Insert the fetched data into the database
            const sql = `INSERT INTO fetches (url, source, source_encoding, source_name, title, keywords, author, publish_date, crawler_time, content, description)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM DUAL
        WHERE NOT EXISTS (SELECT * FROM fetches WHERE url = ?)`;
            const values = [
                fetch.url,
                fetch.source,
                fetch.source_encoding,
                fetch.source_name,
                fetch.title,
                fetch.keywords,
                fetch.author,
                fetch.publish_date,
                fetch.crawltime,
                fetch.content,
                fetch.desc,
                fetch.url,
            ];

            connection.query(sql, values, function (error, results, fields) {
                if (error) throw error;
                if (results.affectedRows > 0) {
                    console.log('Data inserted successfully');
                } else {
                    console.log('URL already exists, skipping: ' + myURL);
                }
            });
        });
    });
}

seedget();

