import express from 'express';
import {
  listarEstoque,
  buscarProdutoPorIdCtrl,
  cadastrarProduto,
  atualizarProdutoCtrl,
  atualizarEstoqueParcial,
  deletarProdutoCtrl
} from '../controllers/estoqueController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const estoqueRoutes = express.Router();

estoqueRoutes.get('/', autenticar, listarEstoque);
estoqueRoutes.get('/:id', autenticar, buscarProdutoPorIdCtrl);
estoqueRoutes.post('/', autenticar, cadastrarProduto);
estoqueRoutes.put('/:id', autenticar, atualizarProdutoCtrl);
estoqueRoutes.patch('/:id', autenticar, atualizarEstoqueParcial);
estoqueRoutes.delete('/:id', autenticar, deletarProdutoCtrl);

export default estoqueRoutes;