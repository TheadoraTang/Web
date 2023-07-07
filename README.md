# 华东师范大学数据科学与工程学院Web编程暑期项目
1.在运行这段代码前，请确定你已经下载了nodejs，mysql。同时下载了request，cheerio，mysql，moment等，如果没有，可以使用
```javascript
npm install 你需要的包
```
下载你需要的内容 \
2.将createTables.sql的内容复制到MySQL Command Line里，建立自己的数据库和表格\
3.将crawler js目录里所有的爬虫文件的数据库连接部分换成你自己的数据库
```javascript
const dbConfig = {
    host: '',
    user: '',
    password: '',
    database: '',
};
```
之后再运行爬虫代码，将新闻爬取到你的数据库中。\
4.运行main.js,访问localhost:3000，就可以看到内容啦。