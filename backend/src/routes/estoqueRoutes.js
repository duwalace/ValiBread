import express from 'express';
import {
    listarEstoque, 
    buscarProdutoPorId, 
    cadastrarProduto, 
    atualizarProduto, 
    atualizarEstoqueParcial, 
    deletarProduto 
} from './controllers/estoqueController.js';

const estoqueRoutes = express.Router();

estoqueRoutes.get('/', listarEstoque);
estoqueRoutes.get('/:id', buscarProdutoPorId);
estoqueRoutes.post('/', cadastrarProduto);
estoqueRoutes.put('/:id', atualizarProduto);
estoqueRoutes.patch('/:id', atualizarEstoqueParcial);
estoqueRoutes.delete('/:id', deletarProduto);

export default estoqueRoutes;