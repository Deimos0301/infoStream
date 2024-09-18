const express = require("express");
var bodyParser = require('body-parser');
const path = require('path');
var bodyParser = require('body-parser');
const config = require('./config');
const sql = require("mssql");
const basicAuth = require('express-basic-auth');
const { createHash } = require("crypto");
const moment = require("moment");
var bodyParser = require('body-parser');
const Excel = require('exceljs');


const pool = new sql.ConnectionPool(config.mssql);

const app = express();

const encode = (e) => createHash("sha512").update(e).digest("hex").toUpperCase();

pool.connect().then(async (p) => {
    await pool.query(`
        if Object_ID('HttpUsers') is NULL 
        begin 
            create table HttpUsers(
                User_ID int identity PRIMARY KEY ,
                User_Name varchar(200) not NULL,
                User_Login varchar(20) not NULL,
                User_Psw varchar(500) not NULL
            );
            create unique index HttpUsers_UQ on HttpUsers(User_Login);
            set IDENTITY_INSERT HttpUsers on;

            insert into HttpUsers(User_ID, User_Name, User_Login, User_Psw)
            values(0, 'Администратор', 'Admin', CONVERT(varchar(max), HASHBYTES('SHA2_512', '12-50-982') ,2));

            set IDENTITY_INSERT HttpUsers off;
        end
        `);
    const server = app.listen(config.port, () => {
        const port = server.address().port;
        console.log('App is listening at port %s', port);
    });

}).catch(function (err) {
    console.error('Error creating connection pool', err)
});

var options = {
    inflate: true,
    limit: '100kb',
    type: 'application/octet-stream'
};

app.use(bodyParser.raw(options));
app.use(express.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({
    limit: '15mb',
    extended: true,
    parameterLimit: 50000
}));

app.use(express.static(path.join(__dirname, './build')));


const myAsyncAuthorizer = async (userlogin, password, cb) => {
    const res = (await pool.query(`select * from HttpUsers a where upper(a.User_Login) = upper('${userlogin}')`)).recordset;
    if (!res.length) {
        return cb(null, false)
    };
    if (userlogin.toUpperCase() === res[0].User_Login.toUpperCase() && encode(password) === res[0].User_Psw)
        return cb(null, true)
    else
        return cb(null, false)
};

// app.use(basicAuth({
//     authorizer: myAsyncAuthorizer,
//     authorizeAsync: true,
// }));

const whoAmI = async (login) => {
    const user = (await pool.query(`select * from HttpUsers where User_Login = ${login}`)).recordset;
    if (!user.length) {
        return undefined
    } else {
        return user[0].User_ID;
    };
}

app.post('/api/infoStream', async (req, res) => {
    const pp = (await pool.query('select * from ADM_GROUP')).recordset;
    res.status(200).send(pp)
});

app.post('/api/users', async (req, res) => {
    const { User_Name, User_Login, User_Psw } = req.body;
    const pp = await pool.query(`insert into HttpUsers (User_Name, User_Login, User_Psw)
    VALUES('${User_Name}','${User_Login}',CONVERT(varchar(max), HASHBYTES('SHA2_512', '${User_Psw}') ,2))`);

    res.status(200).send('OK');
});

app.put('/api/users', async (req, res) => {
    const { User_Name, User_Login, User_Psw } = req.body;
    const pp = await pool.query(`update HttpUsers set User_Name = '${User_Name}', User_Psw = CONVERT(varchar(max), HASHBYTES('SHA2_512', '${User_Psw}') ,2)
    where User_Login = '${User_Login}'`);

    res.status(200).send('OK');
});

app.delete('/api/users', async (req, res) => {
    const { User_Login } = req.body;
    const pp = await pool.query(`delete from HttpUsers where User_Login = '${User_Login}`);
    res.status(200).send('OK');
});

const jsonToCsv = (data) => {
    // Заголовок csv
    const header = Object.keys(data[0]);

    // Заголовок в строку с разделителем
    const headerString = header.join(';');

    // Обработка null или undefined значений. А иначе stringify их пропустит
    const replacer = (key, value) => value ?? '';

    // Массив исходных данных преобразуем в новый массив, состоящий уже не из объектов, а из строк
    const rowItems = data.map((row) =>
        header // По каждому ключу заголовка берем его stringify-значение,
            // пихаем его в массив, а затем этот массив преобразуем в строку с разделителем
            .map((key) => JSON.stringify(row[key], replacer))
            .join(';')
    );

    // Склеиваем заголовок и данные в один массив и преобразовываем его в строки
    const csv = [headerString, ...rowItems].join('\n');

    return csv;
}

app.get("/api/parts", async (req, res) => {
    const arr = config.parts.map(e => {
        return (
            { name: e.name, code: e.code, url: e.url }
        )
    })
    res.status(200).send(arr);
})

app.get('/api/*', async (req, res) => {
    let { start, end, period, spin, type } = req.query;

    console.log(req.query);
    const part = req.url.split("?")[0].split("/").pop().toUpperCase();

    
    end = end || moment().format('YYYYMMDD');

    if (period) {
        end = moment().format('YYYYMMDD');

        switch (period) {
            case 'Y':
                start = moment().add(-spin, 'year').format('YYYYMMDD');
                break;
            case 'M':
                start = moment().add(-spin, 'month').format('YYYYMMDD');
                break;
            case 'D':
                start = moment().add(-spin, 'day').format('YYYYMMDD');
                break;
            default:
                res.status(500).send('NOT OK');
                return;
        }
    } else {
        start = start || '20170101';
    }

    let sql = config.parts.find(e => e.code.toUpperCase() === part).sql;
    sql = sql.replace(":start", `'${start}'`).replace(":end", `'${end}'`)



    const data = (await pool.query(sql)).recordset;

    if (!data.length) {
        res.status(412).json({message: "Данных не найдено!"});
        return;
    }

    if (type.toLowerCase() === "csv") {
        const csv = jsonToCsv(data)
        // console.log(csv);
        res.setHeader('Content-Disposition', 'Attachment;filename=Test.csv');
        res.write(csv);
        res.end();
        return;
    } else if (type.toLowerCase() === "xlsx") {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Лист');

        worksheet.addRow(Object.keys(data[0]));

        data.forEach(e => worksheet.addRow(Object.values(e)));
        worksheet.autoFilter = {
            from: 'A1',
            to: String.fromCharCode(65 + Object.keys(data[0]).length - 1) + '1',
        };

        worksheet.views = [
            { state: "frozen", xSplit: 0, ySplit: 1, activeCell: "A1" }
        ];

        worksheet.columns.forEach(column => {
            const maxLength = column.values.reduce((max, value) => {
                if (value instanceof Date) {
                    return 12
                } else {
                    return Math.max(max, String(value).length);
                }
            }, 0);
            column.width = maxLength + 2;

            worksheet.eachRow((row) => {
                row.getCell(column.number).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        });
        res.attachment('data.xlsx');
        await workbook.xlsx.write(res);
        res.end();
        return;
    } 
    
    res.status(200).send(data);
})








//connect the pool and start the web server when done
// pool.connect().then(async (p) => {
//     const server = app.listen(config.port, () => {
//         const port = server.address().port;
//         console.log('App is listening at port %s', port);
//     });

// }).catch(function (err) {
//     console.error('Error creating connection pool', err)
// });
