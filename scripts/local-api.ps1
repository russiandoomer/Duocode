$env:MYSQL_HOST = '127.0.0.1'
$env:MYSQL_PORT = '3306'
$env:MYSQL_DATABASE = 'duocode'
$env:MYSQL_USER = 'root'
$env:MYSQL_PASSWORD = ''

node ./server/index.js
