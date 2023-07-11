import express from 'express';
import dotenv from 'dotenn';
import bodegasRouter from '../routers/bodegas.js';
import productosRouter from '../routers/productos.js';
import inventariosRouter from '../routers/inventarios.js';
import trasladarRouter from '../routers/trasladar.js';
import { handleInternalServerError, handleForbiddenError } from '../errors/errors.js';

dotenv.config();
const { MY_CONFIG } = process.env;
const { port, hostname } = JSON.parse(MY_CONFIG);
const app = express();

app.use(express.json());
function authenticate(req, res, next) {
    const isAuthenticated = true;
    if (!isAuthenticated) {
        return res.redirect('/login');
    }
    next();
}
function authorize(req, res, next) {
    const hasPermission = true;
    if (!hasPermission) {
        return handleForbiddenError(res);
    }
    next();
}

app.use('/bodegas', authenticate, authorize, bodegasRouter);
app.use('/productos', authenticate, authorize, productosRouter);
app.use('/inventarios', authenticate, authorize, inventariosRouter);
app.use('/trasladar', authenticate, authorize, trasladarRouter);
app.use((err, req, res, next) => {
    handleInternalServerError(err, res);
});

app.listen(port, hostname, () => {
    console.log(`http://${hostname}:${port}`);
});
