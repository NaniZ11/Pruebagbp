import { Router } from 'express';
import { getConnection } from '../db/connection.js';
import {
    handleInternalServerError,
    handleDuplicateEntryError,
    handleInvalidDataError,
} from '../errors/errors.js';

const router = Router();

router.post('/', async (req, res) => {
    const { id_producto, id_bodega, cantidad } = req.body;

    try {
        const connection = await getConnection();
        await startTransaction(connection);

        try {
            const existingRecord = await getExistingRecord(connection, id_producto, id_bodega);

            if (!existingRecord) {
                await insertNewInventory(connection, id_producto, id_bodega, cantidad);
            } else {
                const updatedCantidad = existingRecord.cantidad + cantidad;

                await updateExistingInventory(connection, id_producto, id_bodega, updatedCantidad);
            }

            await commitTransaction(connection);

            res.send('Registro de inventario insertado o actualizado exitosamente');
        } catch (error) {
            await rollbackTransaction(connection);
            handleError(error, res);
        }
    } catch (error) {
        handleInternalServerError(error, res);
    }
});

async function startTransaction(connection) {
    await connection.query('START TRANSACTION');
}

async function commitTransaction(connection) {
    await connection.query('COMMIT');
}

async function rollbackTransaction(connection) {
    await connection.query('ROLLBACK');
}

async function getExistingRecord(connection, id_producto, id_bodega) {
    const [rows] = await connection.query(
        'SELECT cantidad FROM inventarios WHERE id_producto = ? AND id_bodega = ?',
        [id_producto, id_bodega]
    );

    return rows.length > 0 ? rows[0] : null;
}

async function insertNewInventory(connection, id_producto, id_bodega, cantidad) {
    const defaultUserId = await getDefaultUserId(connection);

    await connection.query(
        'INSERT INTO inventarios (id_producto, id_bodega, cantidad, created_by, update_by) VALUES (?, ?, ?, ?, ?)',
        [id_producto, id_bodega, cantidad, defaultUserId, defaultUserId]
    );
}

async function updateExistingInventory(connection, id_producto, id_bodega, updatedCantidad) {
    const defaultUserId = await getDefaultUserId(connection);

    await connection.query(
        'UPDATE inventarios SET cantidad = ?, update_by = ? WHERE id_producto = ? AND id_bodega = ?',
        [updatedCantidad, defaultUserId, id_producto, id_bodega]
    );
}

async function getDefaultUserId(connection) {
    const [defaultUser] = await connection.query('SELECT id FROM users ORDER BY id LIMIT 1');
    return defaultUser?.id;
}

function handleError(error, res) {
    if (error.code === 'ER_DUP_ENTRY') {
        handleDuplicateEntryError(res);
    } else if (error.code === 'ER_WARN_DATA_OUT_OF_RANGE') {
        handleInvalidDataError(res, 'La cantidad ingresada es inválida');
    } else {
        throw error;
    }
}

export default router;
