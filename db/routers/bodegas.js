import { Router } from 'express';
import { getConnection } from '../db/connection.js';
import { handleInternalServerError, handleMissingDataError, handleDuplicateEntryError } from '../errors/errors.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const connection = await getConnection();
        const query = 'SELECT * FROM bodegas ORDER BY nombre';
        const [rows] = await connection.query(query);
        res.json(rows);
    } catch (error) {
        handleInternalServerError(error, res);
    }
});

router.post('/', async (req, res) => {
    const { nombre, id_responsable, estado, created_by, update_by } = req.body;

    if (!nombre || !id_responsable || !estado) {
        return handleMissingDataError(res);
    }

    try {
        const connection = await getConnection();
        const insertQuery = 'INSERT INTO bodegas(nombre, id_responsable, estado, created_by, update_by, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)';
        const values = [nombre, id_responsable, estado, created_by, update_by];
        await connection.query(insertQuery, values);
        res.send('Bodega creada exitosamente');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            handleDuplicateEntryError(res);
        } else {
            handleInternalServerError(error, res);
        }
    }
});

export default router;