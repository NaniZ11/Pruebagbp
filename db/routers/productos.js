import { Router } from 'express';
import { getConnection } from '../db/connection.js';
import { handleInternalServerError, handleMissingDataError, handleNoDefaultUserError, handleNoDefaultWarehouseError, handleDuplicateEntryError } from '../errors/errors.js';

const router = Router();

// Obtener productos con total de inventario
router.get('/', async (req, res) => {
    try {
        const connection = await getConnection();
        const query = `
      SELECT p.*, SUM(i.cantidad) AS Total
      FROM productos p
      JOIN inventarios i ON p.id = i.id_producto
      GROUP BY p.id
      ORDER BY Total DESC;
    `;
        const [rows] = await connection.query(query);
        res.json(rows);
    } catch (error) {
        handleInternalServerError(error, res);
    }
});

// Crear un nuevo producto
router.post('/', async (req, res) => {
    try {
        const { nombre, descripcion, cantidadInicial } = req.body;

        if (!nombre || !descripcion || !cantidadInicial) {
            return handleMissingDataError(res);
        }

        const connection = await getConnection();
        await connection.query('START TRANSACTION');

        const [defaultUser] = await connection.query(
            'SELECT id FROM users ORDER BY id LIMIT 1'
        );
        const defaultUserId = defaultUser?.[0]?.id;

        if (!defaultUserId) {
            return handleNoDefaultUserError(res);
        }

        const [defaultWarehouse] = await connection.query(
            'SELECT id FROM bodegas ORDER BY id LIMIT 1'
        );
        const defaultWarehouseId = defaultWarehouse?.[0]?.id;

        if (!defaultWarehouseId) {
            return handleNoDefaultWarehouseError(res);
        }

        const insertProductQuery =
            'INSERT INTO productos (nombre, descripcion, estado, created_by, update_by) VALUES (?, ?, ?, ?, ?)';
        const productValues = [
            nombre,
            descripcion,
            1,
            defaultUserId,
            defaultUserId,
        ];

        try {
            const [productResult] = await connection.query(
                insertProductQuery,
                productValues
            );
            const productId = productResult.insertId;

            const insertInventoryQuery =
                'INSERT INTO inventarios (id_bodega, id_producto, cantidad, created_by, update_by) VALUES (?, ?, ?, ?, ?)';
            const inventoryValues = [
                defaultWarehouseId,
                productId,
                cantidadInicial,
                defaultUserId,
                defaultUserId,
            ];
            await connection.query(insertInventoryQuery, inventoryValues);

            await connection.query('COMMIT');

            res.send('Producto creado exitosamente');
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                handleDuplicateEntryError(res);
            } else {
                handleInternalServerError(error, res);
            }
        }
    } catch (error) {
        handleInternalServerError(error, res);
    }
});

export default router;
