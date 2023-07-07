const fs = require('fs');
const mysql = require('mysql');
const myRequest = require('request');
const myCheerio = require('cheerio');
const myIconv = require('iconv-lite');
require('date-utils');

// const url_reg = /m\/c\/(\d{4})-(\d{2})-(\d{2})\/doc-(\w{8})(\d{7}).shtml/;
// const url_reg = /y\/yrihan\/(\d{4})-(\d{2})-(\d{2})\/doc-(\w{8})(\d{7}).shtml/;
// const url_reg = /y\/yneidi\/(\d{4})-(\d{2})-(\d{2})\/doc-(\w{8})(\d{7}).shtml/;
// const url_reg = /tv\/zy\/(\d{4})-(\d{2})-(\d{2})\/doc-(\w{8})(\d{7}).shtml/;
const url_reg = /y\/ygangtai\/(\d{4})-(\d{2})-(\d{2})\/doc-(\w{8})(\d{7}).shtml/;

const regExp = /((\d{4}|\d{2})(\-|\/|\.)\d{1,2}\3\d{1,2})|(\d{4}年\d{1,2}月\d{1,2}日)/;
const seedURL_format = "$('a')";
const keywords_format = " $('meta[name=\"keywords\"]').eq(0).attr(\"content\")";
const source_format = " $('meta[name=\"mediaid\"]').eq(0).attr(\"content\")";
const title_format =  "$('title').text()";
const date_format = "$('meta[property=\"article:published_time\"]').eq(0).attr(\"content\")";
const author_format = "$('meta[property=\"article:author\"]').eq(0).attr(\"content\")";
const desc_format = " $('meta[name=\"description\"]').eq(0).attr(\"content\")";
const content_format = "$('.article').text()";

const source_name = "新浪新闻";
const domain = 'https://ent.sina.com.cn/';
const myEncoding = "utf-8";
const seedURL = 'https://ent.sina.com.cn/';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
};

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'tangxiaohui',
    database: 'web'
};

// Create a database connection
const connection = mysql.createConnection(dbConfig);

// Connect to the database
connection.connect();

function request(url, callback) {
    const options = {
        url: url,
        encoding: null,
        headers: headers,
        timeout: 10000
    };
    myRequest(options, callback);
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
    request(seedURL, function (err, res, body) {
        if (body == undefined) return;
        const html = myIconv.decode(body, myEncoding);
        const $ = myCheerio.load(html, { decodeEntities: true });
        const seedurl_news = eval(seedURL_format);
        seedurl_news.each(function (i, e) {
            let myURL = "";
            try {
                const href = $(e).attr("href");
                if (href == undefined) return;
                if (href.toLowerCase().indexOf('http://') >= 0 || href.toLowerCase().indexOf('https://') >= 0) myURL = href;
                else if (href.startsWith('//')) myURL = 'http:' + href;
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

        request(myURL, function (err, res, body) {
            const html_news = myIconv.decode(body, myEncoding);
            const $ = myCheerio.load(html_news, { decodeEntities: true });
            const myhtml = html_news;

            console.log("转码读取成功: " + myURL);

            const fetch = {};
            fetch.title = "";
            fetch.content = "";
            fetch.publish_date = (new Date()).toFormat("YYYY-MM-DD");
            fetch.url = myURL;
            fetch.source_name = source_name;
            fetch.source_encoding = myEncoding;
            fetch.crawltime = new Date();

            if (keywords_format == "") fetch.keywords = source_name;
            else fetch.keywords = eval(keywords_format);

            if (title_format == "") fetch.title = "";
            else fetch.title = eval(title_format);

            if (date_format != "") fetch.publish_date = eval(date_format);
            if (fetch.publish_date == null) return;
            if (typeof (fetch.publish_time) == 'string') {
                fetch.publish_date = regExp.exec(fetch.publish_date)[0];
                fetch.publish_date = fetch.publish_date.replace('年', '-');
                fetch.publish_date = fetch.publish_date.replace('月', '-');
                fetch.publish_date = fetch.publish_date.replace('日', '');
                fetch.publish_date = new Date(fetch.publish_date).toFormat("YYYY-MM-DD");
            }

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
                fetch.url
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
