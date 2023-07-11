import mysql from 'mysql2/prmise';
import dotenv from 'dotenv';
dotenv.config();

let pool = null;

export async function getConnection() {
    try {
        return pool && !pool._closed ? pool : await createPool();
    } catch (error) {
        console.error('Error al establecer la conexión:', error);
        throw new Error('Database Connection Error');
    }
}

async function createPool() {
    pool = await mysql.createPool({
        host: process.env.HOST,
        user: process.env.USUARIO,
        password: process.env.PASSWORD,
        database: process.env.DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    console.log('Conexión exitosa a la base de datos');
    return pool;
}
