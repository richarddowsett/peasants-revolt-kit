"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const router_1 = require("./adapters/inbound/http/router");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Mount Hexagonal HTTP API Router
app.use('/api', router_1.apiRouter);
app.listen(port, () => {
    console.log(`Peasants Running Kit Hexagonal Backend API listening on port ${port}`);
});
