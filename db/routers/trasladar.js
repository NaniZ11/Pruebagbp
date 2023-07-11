import { Router } from 'express';
import { getConnection } from '../db/connection.js';
import { handleInternalServerError, handleInsufficientQuantityError, handleDuplicateEntryError, handleInvalidBodegaError } from '../errors/errors.js';

const router = Router();

router.post('/', async (req, res) => {
    const { id_inventario, id_producto, bodega_origen, bodega_destino, cantidad } = req.body;

    try {
        const connection = await getConnection();
        await startTransaction(connection);

        try {
            const [origenRecord, destinoRecord] = await Promise.all([
                getInventoryRecord(connection, id_producto, bodega_origen),
                getInventoryRecord(connection, id_producto, bodega_destino),
            ]);

            if (!origenRecord || !destinoRecord) {
                handleInvalidBodegaError(res, 'Las bodegas especificadas no existen');
                return;
            }

            if (origenRecord.cantidad < cantidad) {
                handleInsufficientQuantityError(res);
                return;
            }

            const updatedCantidadOrigen = origenRecord.cantidad - cantidad;
            const updatedCantidadDestino = destinoRecord.cantidad + cantidad;

            await Promise.all([
                updateInventory(connection, id_producto, bodega_origen, updatedCantidadOrigen),
                updateInventory(connection, id_producto, bodega_destino, updatedCantidadDestino),
                insertHistorial(connection, id_inventario, bodega_origen, bodega_destino, id_producto, cantidad),
            ]);

            await commitTransaction(connection);

            res.send('Producto trasladado exitosamente');
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

async function getInventoryRecord(connection, id_producto, id_bodega) {
    const [rows] = await connection.query(
        'SELECT cantidad FROM inventarios WHERE id_producto = ? AND id_bodega = ?',
        [id_producto, id_bodega]
    );

    return rows.length > 0 ? rows[0] : null;
}

async function updateInventory(connection, id_producto, id_bodega, updatedCantidad) {
    await connection.query(
        'UPDATE inventarios SET cantidad = ? WHERE id_producto = ? AND id_bodega = ?',
        [updatedCantidad, id_producto, id_bodega]
    );
}

async function insertHistorial(connection, id_inventario, bodega_origen, bodega_destino, id_producto, cantidad) {
    const [defaultUser] = await connection.query('SELECT id FROM users ORDER BY id LIMIT 1');
    const defaultUserId = defaultUser?.id;

    if (!cantidad) {
        throw new Error('El campo "cantidad" es requerido');
    }

    await connection.query(
        'INSERT INTO historiales (id_inventario, cantidad, id_bodega_origen, id_bodega_destino, id_producto, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [id_inventario, cantidad, bodega_origen, bodega_destino, id_producto, defaultUserId]
    );
}

function handleError(error, res) {
    if (error.code === 'ER_DUP_ENTRY') {
        handleDuplicateEntryError(res);
    } else {
        throw error;
    }
}

export default router;