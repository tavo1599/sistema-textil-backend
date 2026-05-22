--
-- PostgreSQL database dump
--

\restrict USywfAHKHfoQXJYXriKZQ5bNwANXXAmmXTH0vRHjm5zKiW3eBeG3mLGUgcMYRSY

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Almacen; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE textileria."Almacen" DISABLE TRIGGER ALL;



ALTER TABLE textileria."Almacen" ENABLE TRIGGER ALL;

--
-- Data for Name: Usuario; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."Usuario" DISABLE TRIGGER ALL;

INSERT INTO textileria."Usuario" VALUES (1, 'admin@moditex.com', '$2b$10$Z0nZmh927jC/f8l1nBZjle1/ALLv.S.M9auzkHUgSkUvcvCoGpyg.', 'Admin Moditex', 'ADMIN');


ALTER TABLE textileria."Usuario" ENABLE TRIGGER ALL;

--
-- Data for Name: Auditoria; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."Auditoria" DISABLE TRIGGER ALL;



ALTER TABLE textileria."Auditoria" ENABLE TRIGGER ALL;

--
-- Data for Name: Bodega; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."Bodega" DISABLE TRIGGER ALL;

INSERT INTO textileria."Bodega" VALUES (1, 'Almacen Principal', 'Venta', 'SJL - Los Angeles', true);


ALTER TABLE textileria."Bodega" ENABLE TRIGGER ALL;

--
-- Data for Name: Color; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."Color" DISABLE TRIGGER ALL;

INSERT INTO textileria."Color" VALUES (2, 'PLOMO CLARO', 'PLC', '#D3D3D3');
INSERT INTO textileria."Color" VALUES (1, 'NEGRO', 'NGR', '#000000');
INSERT INTO textileria."Color" VALUES (4, 'AZUL MARINO', 'AZM', '#000080');
INSERT INTO textileria."Color" VALUES (5, 'BLANCO', 'BLC', '#FFFFFF');
INSERT INTO textileria."Color" VALUES (6, 'ARENA', 'ARN', '#C2B280');
INSERT INTO textileria."Color" VALUES (7, 'MELANCH', 'MLC', '#C3B7A6');
INSERT INTO textileria."Color" VALUES (8, 'PISTACHO', 'PST', '#93C572');
INSERT INTO textileria."Color" VALUES (9, 'PLATA CLARO', 'PTC', '#C0C0C0');
INSERT INTO textileria."Color" VALUES (10, 'LAPIZ', 'LPZ', '#41424C');
INSERT INTO textileria."Color" VALUES (11, 'COCOA', 'COA', '#875F42');
INSERT INTO textileria."Color" VALUES (12, 'VERDE BOTELLA', 'VDB', '#006A4E');
INSERT INTO textileria."Color" VALUES (13, 'BEIGE', 'BIG', '#F5F5DC');
INSERT INTO textileria."Color" VALUES (14, 'MANTEQUILLA', 'MTQ', '#FFFF81');
INSERT INTO textileria."Color" VALUES (15, 'GRIS', 'GRS', '#808080');
INSERT INTO textileria."Color" VALUES (16, 'PLOMO MEDIO', 'PLM', '#555555');
INSERT INTO textileria."Color" VALUES (17, 'PLOMO PLATA', 'PLP', '#999B9B');
INSERT INTO textileria."Color" VALUES (18, 'ACERO', 'ACR', '#4682B4');
INSERT INTO textileria."Color" VALUES (19, 'VERDE TOPO', 'VDT', ' #008F39');
INSERT INTO textileria."Color" VALUES (20, 'GUINDA', 'GND', '#800040');
INSERT INTO textileria."Color" VALUES (21, 'VERDE MILITAR', 'VDM', '#4B5320');
INSERT INTO textileria."Color" VALUES (22, 'AZUL NOCHE', 'AZN', '#252850');
INSERT INTO textileria."Color" VALUES (23, 'MARRON', 'MRN', '#964B00');
INSERT INTO textileria."Color" VALUES (24, 'CAMELLO', 'CML', '#C19A6B');
INSERT INTO textileria."Color" VALUES (25, 'GRIS OSCURO', 'GRO', '#36454F');
INSERT INTO textileria."Color" VALUES (26, 'KAKI', 'KAK', '#C3B091');
INSERT INTO textileria."Color" VALUES (27, 'LILA', 'LIL', '#cea2fd');
INSERT INTO textileria."Color" VALUES (28, 'MELON', 'MLN', '#FEBAAD');
INSERT INTO textileria."Color" VALUES (29, 'ROJO', 'RJO', '#FF0000');
INSERT INTO textileria."Color" VALUES (30, 'TIERRA', 'TRA', '#4e3b31');
INSERT INTO textileria."Color" VALUES (31, 'ACERO CLARO', 'ACC', '#B0C4DE');
INSERT INTO textileria."Color" VALUES (32, 'CEMENTO CLARO', 'CMC', '#A5A391');
INSERT INTO textileria."Color" VALUES (33, 'VINO', 'VIN', '#722F37');
INSERT INTO textileria."Color" VALUES (34, 'CAMOTE', 'CMT', '#E48948');
INSERT INTO textileria."Color" VALUES (35, 'MALVA', 'MLV', '#E0B0FF');
INSERT INTO textileria."Color" VALUES (36, 'NARANJA', 'NRJ', '#d4480c');


ALTER TABLE textileria."Color" ENABLE TRIGGER ALL;

--
-- Data for Name: Venta; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."Venta" DISABLE TRIGGER ALL;



ALTER TABLE textileria."Venta" ENABLE TRIGGER ALL;

--
-- Data for Name: DespachoVenta; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."DespachoVenta" DISABLE TRIGGER ALL;



ALTER TABLE textileria."DespachoVenta" ENABLE TRIGGER ALL;

--
-- Data for Name: Producto; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."Producto" DISABLE TRIGGER ALL;

INSERT INTO textileria."Producto" VALUES (1, 'PLBA-REG-548', 'POLO BÁSICO REGULAR', 'Polos', NULL, false, NULL, NULL);
INSERT INTO textileria."Producto" VALUES (2, 'CATL-LRG-752', 'CASACA TASLAN LARGA', 'Casacas', NULL, false, NULL, NULL);
INSERT INTO textileria."Producto" VALUES (3, 'POBA-CRD-586', 'POLERA BASICA CERRADA', 'Poleras', NULL, false, NULL, NULL);
INSERT INTO textileria."Producto" VALUES (4, 'POBA-ABR-758', 'POLERA BASICA ABIERTA', 'Poleras', NULL, false, NULL, NULL);
INSERT INTO textileria."Producto" VALUES (5, 'JORG-PTN-256', 'JOGUER', 'Pantalones', NULL, false, NULL, NULL);
INSERT INTO textileria."Producto" VALUES (6, 'BZCJ-CLS-458', 'BUZO CONJUNTO CLASICO', 'Conjuntos', NULL, false, NULL, NULL);
INSERT INTO textileria."Producto" VALUES (7, 'BZCJ-MDO-782', 'BUZO CONJUNTO MODA', 'Conjuntos', NULL, false, NULL, NULL);
INSERT INTO textileria."Producto" VALUES (8, 'CAMS-CDR-259', 'CAMISA CUADROS', 'Camisas', NULL, false, NULL, NULL);
INSERT INTO textileria."Producto" VALUES (9, 'CSTS-CRT-326', 'CASACA TASLAN CORTA', 'Casacas', NULL, false, NULL, NULL);
INSERT INTO textileria."Producto" VALUES (10, 'PLCS-RGL-259', 'POLO CAMISERO', 'Polos', NULL, false, NULL, NULL);


ALTER TABLE textileria."Producto" ENABLE TRIGGER ALL;

--
-- Data for Name: OrdenProduccion; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."OrdenProduccion" DISABLE TRIGGER ALL;



ALTER TABLE textileria."OrdenProduccion" ENABLE TRIGGER ALL;

--
-- Data for Name: ProveedorTaller; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."ProveedorTaller" DISABLE TRIGGER ALL;



ALTER TABLE textileria."ProveedorTaller" ENABLE TRIGGER ALL;

--
-- Data for Name: GuiaServicio; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."GuiaServicio" DISABLE TRIGGER ALL;



ALTER TABLE textileria."GuiaServicio" ENABLE TRIGGER ALL;

--
-- Data for Name: GuiaDetalle; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."GuiaDetalle" DISABLE TRIGGER ALL;



ALTER TABLE textileria."GuiaDetalle" ENABLE TRIGGER ALL;

--
-- Data for Name: Insumo; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."Insumo" DISABLE TRIGGER ALL;



ALTER TABLE textileria."Insumo" ENABLE TRIGGER ALL;

--
-- Data for Name: InventarioTerminado; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."InventarioTerminado" DISABLE TRIGGER ALL;

INSERT INTO textileria."InventarioTerminado" VALUES (84, 3, 1, 'PLM', 'S', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (85, 3, 1, 'ACC', 'S', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (86, 3, 1, 'ARN', 'S', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (88, 3, 1, 'AZM', 'M', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (89, 3, 1, 'AZM', 'S', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (5, 5, 1, 'NGR', 'S', 19);
INSERT INTO textileria."InventarioTerminado" VALUES (91, 3, 1, 'MLV', 'M', 17);
INSERT INTO textileria."InventarioTerminado" VALUES (92, 3, 1, 'RJO', 'M', 11);
INSERT INTO textileria."InventarioTerminado" VALUES (93, 3, 1, 'MLN', 'M', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (2, 5, 1, 'NGR', 'XL', 19);
INSERT INTO textileria."InventarioTerminado" VALUES (7, 5, 1, 'PLP', 'L', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (95, 3, 1, 'MLN', 'L', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (97, 3, 1, 'CML', 'L', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (3, 5, 1, 'NGR', 'L', 16);
INSERT INTO textileria."InventarioTerminado" VALUES (1, 5, 1, 'NGR', 'M', 36);
INSERT INTO textileria."InventarioTerminado" VALUES (98, 3, 1, 'RJO', 'L', 6);
INSERT INTO textileria."InventarioTerminado" VALUES (10, 5, 1, 'AZM', 'M', 11);
INSERT INTO textileria."InventarioTerminado" VALUES (9, 5, 1, 'AZM', 'L', 7);
INSERT INTO textileria."InventarioTerminado" VALUES (8, 5, 1, 'MLC', 'L', 7);
INSERT INTO textileria."InventarioTerminado" VALUES (21, 5, 1, 'PLP', '38', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (18, 5, 1, 'PLM', 'L', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (99, 3, 1, 'MLV', 'L', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (6, 5, 1, 'PLM', 'S', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (13, 5, 1, 'AZM', 'S', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (11, 5, 1, 'AZM', 'XL', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (12, 5, 1, 'PLP', 'XL', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (16, 5, 1, 'MLC', 'XL', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (4, 5, 1, 'PLM', 'XL', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (15, 5, 1, 'PLP', 'S', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (14, 5, 1, 'MLC', 'S', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (17, 5, 1, 'PLM', 'M', 10);
INSERT INTO textileria."InventarioTerminado" VALUES (20, 5, 1, 'PLP', 'M', 11);
INSERT INTO textileria."InventarioTerminado" VALUES (19, 5, 1, 'MLC', 'M', 11);
INSERT INTO textileria."InventarioTerminado" VALUES (22, 6, 1, 'MLC', 'L', 11);
INSERT INTO textileria."InventarioTerminado" VALUES (23, 6, 1, 'VDT', 'L', 6);
INSERT INTO textileria."InventarioTerminado" VALUES (24, 6, 1, 'NGR', 'L', 22);
INSERT INTO textileria."InventarioTerminado" VALUES (25, 6, 1, 'BIG', 'L', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (26, 7, 1, 'AZM', 'L', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (27, 7, 1, 'ACR', 'L', 0);
INSERT INTO textileria."InventarioTerminado" VALUES (28, 6, 1, 'ACR', 'L', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (29, 6, 1, 'GRO', 'L', 10);
INSERT INTO textileria."InventarioTerminado" VALUES (30, 6, 1, 'AZN', 'L', 13);
INSERT INTO textileria."InventarioTerminado" VALUES (34, 6, 1, 'VDT', 'M', 12);
INSERT INTO textileria."InventarioTerminado" VALUES (36, 6, 1, 'MRN', 'M', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (39, 7, 1, 'BIG', 'S', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (42, 6, 1, 'MRN', 'S', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (43, 6, 1, 'ACR', 'M', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (44, 6, 1, 'GRO', 'M', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (51, 7, 1, 'VDT', 'S', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (37, 6, 1, 'BIG', 'M', 15);
INSERT INTO textileria."InventarioTerminado" VALUES (52, 6, 1, 'BIG', 'S', 10);
INSERT INTO textileria."InventarioTerminado" VALUES (41, 6, 1, 'VDT', 'S', 13);
INSERT INTO textileria."InventarioTerminado" VALUES (32, 7, 1, 'GRS', 'M', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (38, 7, 1, 'AZM', 'S', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (47, 7, 1, 'GRO', 'S', 0);
INSERT INTO textileria."InventarioTerminado" VALUES (48, 7, 1, 'GRO', 'M', 0);
INSERT INTO textileria."InventarioTerminado" VALUES (49, 7, 1, 'ACR', 'S', 0);
INSERT INTO textileria."InventarioTerminado" VALUES (54, 7, 1, 'GRS', 'S', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (55, 7, 1, 'VDT', 'L', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (57, 7, 1, 'GRO', 'XL', 0);
INSERT INTO textileria."InventarioTerminado" VALUES (56, 7, 1, 'VIN', 'L', 0);
INSERT INTO textileria."InventarioTerminado" VALUES (58, 6, 1, 'VIN', 'L', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (60, 6, 1, 'ACR', 'XL', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (61, 6, 1, 'BIG', 'XL', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (62, 6, 1, 'AZN', 'XL', 6);
INSERT INTO textileria."InventarioTerminado" VALUES (63, 6, 1, 'VIN', 'XL', 6);
INSERT INTO textileria."InventarioTerminado" VALUES (59, 6, 1, 'GRO', 'XL', 8);
INSERT INTO textileria."InventarioTerminado" VALUES (64, 6, 1, 'PTC', 'XL', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (65, 6, 1, 'NGR', 'XL', 10);
INSERT INTO textileria."InventarioTerminado" VALUES (45, 6, 1, 'GRS', 'M', 0);
INSERT INTO textileria."InventarioTerminado" VALUES (66, 6, 1, 'PTC', 'M', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (31, 7, 1, 'VDT', 'M', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (68, 7, 1, 'BIG', 'L', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (69, 7, 1, 'BIG', 'M', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (50, 7, 1, 'MLC', 'S', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (70, 7, 1, 'MLC', 'M', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (71, 7, 1, 'AZM', 'M', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (72, 3, 1, 'RJO', 'S', 8);
INSERT INTO textileria."InventarioTerminado" VALUES (73, 3, 1, 'VIN', 'S', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (74, 3, 1, 'CML', 'S', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (77, 3, 1, 'KAK', 'S', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (75, 3, 1, 'LIL', 'S', 9);
INSERT INTO textileria."InventarioTerminado" VALUES (78, 3, 1, 'MLV', 'S', 6);
INSERT INTO textileria."InventarioTerminado" VALUES (79, 3, 1, 'GND', 'S', 6);
INSERT INTO textileria."InventarioTerminado" VALUES (125, 3, 1, 'VDT', 'L', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (104, 3, 1, 'ARN', 'L', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (106, 3, 1, 'ARN', 'XL', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (109, 3, 1, 'MLV', 'XL', 11);
INSERT INTO textileria."InventarioTerminado" VALUES (110, 3, 1, 'RJO', 'XL', 8);
INSERT INTO textileria."InventarioTerminado" VALUES (111, 3, 1, 'GND', 'XL', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (112, 3, 1, 'MRN', 'XL', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (113, 3, 1, 'CML', 'XL', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (82, 3, 1, 'MLC', 'S', 7);
INSERT INTO textileria."InventarioTerminado" VALUES (83, 3, 1, 'GRO', 'S', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (115, 3, 1, 'VDT', 'S', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (116, 3, 1, 'VDB', 'S', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (81, 3, 1, 'BIG', 'S', 7);
INSERT INTO textileria."InventarioTerminado" VALUES (76, 3, 1, 'MRN', 'S', 12);
INSERT INTO textileria."InventarioTerminado" VALUES (105, 3, 1, 'GRO', 'L', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (80, 3, 1, 'CMC', 'S', 8);
INSERT INTO textileria."InventarioTerminado" VALUES (117, 3, 1, 'ACR', 'S', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (118, 3, 1, 'MRN', 'M', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (127, 3, 1, 'CMC', 'L', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (119, 3, 1, 'CMC', 'M', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (120, 3, 1, 'ACR', 'M', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (121, 3, 1, 'TRA', 'M', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (90, 3, 1, 'BIG', 'M', 15);
INSERT INTO textileria."InventarioTerminado" VALUES (122, 3, 1, 'VDB', 'M', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (123, 3, 1, 'MLC', 'M', 6);
INSERT INTO textileria."InventarioTerminado" VALUES (124, 3, 1, 'ACR', 'L', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (96, 3, 1, 'MRN', 'L', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (102, 3, 1, 'VDB', 'L', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (114, 3, 1, 'MLC', 'XL', 6);
INSERT INTO textileria."InventarioTerminado" VALUES (107, 3, 1, 'CMC', 'XL', 10);
INSERT INTO textileria."InventarioTerminado" VALUES (87, 3, 1, 'AZM', 'L', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (128, 3, 1, 'ACR', 'XL', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (129, 3, 1, 'VDB', 'XL', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (108, 3, 1, 'BIG', 'XL', 12);
INSERT INTO textileria."InventarioTerminado" VALUES (130, 3, 1, 'VDT', 'XL', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (131, 3, 1, 'PLC', 'XL', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (94, 3, 1, 'BIG', 'L', 22);
INSERT INTO textileria."InventarioTerminado" VALUES (126, 3, 1, 'PLC', 'L', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (103, 3, 1, 'NGR', 'L', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (100, 3, 1, 'MLC', 'L', 15);
INSERT INTO textileria."InventarioTerminado" VALUES (101, 3, 1, 'TRA', 'L', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (132, 4, 1, 'VDT', 'L', 9);
INSERT INTO textileria."InventarioTerminado" VALUES (135, 4, 1, 'ACR', 'L', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (138, 4, 1, 'BIG', 'S', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (139, 4, 1, 'MLC', 'S', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (140, 4, 1, 'PTC', 'S', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (143, 4, 1, 'MRN', 'S', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (144, 4, 1, 'COA', 'S', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (141, 4, 1, 'ACR', 'S', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (148, 4, 1, 'GRO', 'S', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (145, 4, 1, 'NGR', 'S', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (149, 4, 1, 'LIL', 'S', 7);
INSERT INTO textileria."InventarioTerminado" VALUES (147, 4, 1, 'AZM', 'S', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (146, 4, 1, 'VDB', 'S', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (142, 4, 1, 'PLM', 'S', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (151, 4, 1, 'KAK', 'S', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (137, 4, 1, 'NGR', 'L', 20);
INSERT INTO textileria."InventarioTerminado" VALUES (134, 4, 1, 'TRA', 'L', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (133, 4, 1, 'BIG', 'L', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (53, 7, 1, 'NGR', 'S', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (40, 6, 1, 'MLC', 'S', 19);
INSERT INTO textileria."InventarioTerminado" VALUES (67, 7, 1, 'NGR', 'M', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (35, 6, 1, 'NGR', 'M', 9);
INSERT INTO textileria."InventarioTerminado" VALUES (46, 6, 1, 'NGR', 'S', 8);
INSERT INTO textileria."InventarioTerminado" VALUES (33, 6, 1, 'MLC', 'M', 18);
INSERT INTO textileria."InventarioTerminado" VALUES (150, 4, 1, 'GND', 'S', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (153, 4, 1, 'MLN', 'M', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (154, 4, 1, 'LIL', 'M', 10);
INSERT INTO textileria."InventarioTerminado" VALUES (155, 4, 1, 'VDB', 'M', 8);
INSERT INTO textileria."InventarioTerminado" VALUES (159, 4, 1, 'MRN', 'M', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (162, 4, 1, 'KAK', 'M', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (152, 4, 1, 'CML', 'M', 15);
INSERT INTO textileria."InventarioTerminado" VALUES (157, 4, 1, 'MLC', 'M', 6);
INSERT INTO textileria."InventarioTerminado" VALUES (163, 4, 1, 'PTC', 'M', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (156, 4, 1, 'TRA', 'M', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (158, 4, 1, 'PLM', 'M', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (161, 4, 1, 'NGR', 'M', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (160, 4, 1, 'BIG', 'M', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (164, 4, 1, 'CML', 'L', 8);
INSERT INTO textileria."InventarioTerminado" VALUES (165, 4, 1, 'VDB', 'L', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (167, 4, 1, 'CMC', 'L', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (166, 4, 1, 'LIL', 'L', 8);
INSERT INTO textileria."InventarioTerminado" VALUES (169, 4, 1, 'KAK', 'L', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (171, 4, 1, 'COA', 'L', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (172, 4, 1, 'PLM', 'L', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (173, 4, 1, 'PTC', 'L', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (174, 4, 1, 'AZM', 'L', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (168, 4, 1, 'MRN', 'L', 13);
INSERT INTO textileria."InventarioTerminado" VALUES (170, 4, 1, 'MLC', 'L', 12);
INSERT INTO textileria."InventarioTerminado" VALUES (175, 4, 1, 'LIL', 'XL', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (178, 4, 1, 'KAK', 'XL', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (180, 4, 1, 'GND', 'XL', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (181, 4, 1, 'ARN', 'XL', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (177, 4, 1, 'CMC', 'XL', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (182, 4, 1, 'ACR', 'XL', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (183, 4, 1, 'CML', 'XL', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (184, 4, 1, 'NGR', 'XL', 6);
INSERT INTO textileria."InventarioTerminado" VALUES (186, 4, 1, 'MRN', 'XL', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (187, 4, 1, 'COA', 'XL', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (188, 4, 1, 'ACC', 'XL', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (179, 4, 1, 'VIN', 'XL', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (189, 4, 1, 'PTC', 'XL', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (136, 4, 1, 'BIG', 'XL', 8);
INSERT INTO textileria."InventarioTerminado" VALUES (176, 4, 1, 'VDB', 'XL', 10);
INSERT INTO textileria."InventarioTerminado" VALUES (185, 4, 1, 'MLC', 'XL', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (191, 4, 1, 'TRA', 'XL', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (192, 4, 1, 'NRJ', 'M', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (193, 4, 1, 'GRO', 'XL', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (194, 4, 1, 'TRA', 'S', 2);
INSERT INTO textileria."InventarioTerminado" VALUES (190, 4, 1, 'PLM', 'XL', 3);
INSERT INTO textileria."InventarioTerminado" VALUES (195, 4, 1, 'CMC', 'S', 1);
INSERT INTO textileria."InventarioTerminado" VALUES (200, 10, 1, 'NGR', '4XL', 4);
INSERT INTO textileria."InventarioTerminado" VALUES (202, 10, 1, 'NGR', 'S', 9);
INSERT INTO textileria."InventarioTerminado" VALUES (204, 10, 1, 'BIG', 'S', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (203, 10, 1, 'AZM', 'M', 9);
INSERT INTO textileria."InventarioTerminado" VALUES (207, 10, 1, 'AZM', 'S', 5);
INSERT INTO textileria."InventarioTerminado" VALUES (205, 10, 1, 'BLC', 'S', 10);
INSERT INTO textileria."InventarioTerminado" VALUES (208, 10, 1, 'AZM', 'L', 10);
INSERT INTO textileria."InventarioTerminado" VALUES (197, 10, 1, 'BIG', 'L', 11);
INSERT INTO textileria."InventarioTerminado" VALUES (196, 10, 1, 'NGR', 'L', 30);
INSERT INTO textileria."InventarioTerminado" VALUES (199, 10, 1, 'BIG', 'M', 13);
INSERT INTO textileria."InventarioTerminado" VALUES (201, 10, 1, 'BLC', 'M', 29);
INSERT INTO textileria."InventarioTerminado" VALUES (206, 10, 1, 'BLC', 'L', 29);
INSERT INTO textileria."InventarioTerminado" VALUES (198, 10, 1, 'NGR', 'M', 25);


ALTER TABLE textileria."InventarioTerminado" ENABLE TRIGGER ALL;

--
-- Data for Name: MemoIncidencia; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."MemoIncidencia" DISABLE TRIGGER ALL;



ALTER TABLE textileria."MemoIncidencia" ENABLE TRIGGER ALL;

--
-- Data for Name: MovimientoInventario; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."MovimientoInventario" DISABLE TRIGGER ALL;



ALTER TABLE textileria."MovimientoInventario" ENABLE TRIGGER ALL;

--
-- Data for Name: OrdenCosteoFinal; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."OrdenCosteoFinal" DISABLE TRIGGER ALL;



ALTER TABLE textileria."OrdenCosteoFinal" ENABLE TRIGGER ALL;

--
-- Data for Name: OrdenDetalleMatriz; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."OrdenDetalleMatriz" DISABLE TRIGGER ALL;



ALTER TABLE textileria."OrdenDetalleMatriz" ENABLE TRIGGER ALL;

--
-- Data for Name: OrdenGastoCif; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."OrdenGastoCif" DISABLE TRIGGER ALL;



ALTER TABLE textileria."OrdenGastoCif" ENABLE TRIGGER ALL;

--
-- Data for Name: OrdenRutaServicio; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."OrdenRutaServicio" DISABLE TRIGGER ALL;



ALTER TABLE textileria."OrdenRutaServicio" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductoBom; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."ProductoBom" DISABLE TRIGGER ALL;



ALTER TABLE textileria."ProductoBom" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductoRuta; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."ProductoRuta" DISABLE TRIGGER ALL;



ALTER TABLE textileria."ProductoRuta" ENABLE TRIGGER ALL;

--
-- Data for Name: StockPrenda; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."StockPrenda" DISABLE TRIGGER ALL;



ALTER TABLE textileria."StockPrenda" ENABLE TRIGGER ALL;

--
-- Data for Name: Talla; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."Talla" DISABLE TRIGGER ALL;



ALTER TABLE textileria."Talla" ENABLE TRIGGER ALL;

--
-- Data for Name: VentaDetalle; Type: TABLE DATA; Schema: textileria; Owner: postgres
--

ALTER TABLE textileria."VentaDetalle" DISABLE TRIGGER ALL;



ALTER TABLE textileria."VentaDetalle" ENABLE TRIGGER ALL;

--
-- Name: Almacen_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."Almacen_id_seq"', 1, false);


--
-- Name: Auditoria_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."Auditoria_id_seq"', 1, false);


--
-- Name: Bodega_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."Bodega_id_seq"', 1, true);


--
-- Name: Color_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."Color_id_seq"', 36, true);


--
-- Name: DespachoVenta_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."DespachoVenta_id_seq"', 1, false);


--
-- Name: GuiaDetalle_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."GuiaDetalle_id_seq"', 1, false);


--
-- Name: GuiaServicio_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."GuiaServicio_id_seq"', 1, false);


--
-- Name: Insumo_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."Insumo_id_seq"', 1, false);


--
-- Name: InventarioTerminado_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."InventarioTerminado_id_seq"', 208, true);


--
-- Name: MemoIncidencia_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."MemoIncidencia_id_seq"', 1, false);


--
-- Name: MovimientoInventario_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."MovimientoInventario_id_seq"', 1, false);


--
-- Name: OrdenCosteoFinal_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."OrdenCosteoFinal_id_seq"', 1, false);


--
-- Name: OrdenDetalleMatriz_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."OrdenDetalleMatriz_id_seq"', 1, false);


--
-- Name: OrdenGastoCif_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."OrdenGastoCif_id_seq"', 1, false);


--
-- Name: OrdenProduccion_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."OrdenProduccion_id_seq"', 1, false);


--
-- Name: OrdenRutaServicio_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."OrdenRutaServicio_id_seq"', 1, false);


--
-- Name: ProductoBom_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."ProductoBom_id_seq"', 1, false);


--
-- Name: ProductoRuta_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."ProductoRuta_id_seq"', 1, false);


--
-- Name: Producto_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."Producto_id_seq"', 10, true);


--
-- Name: ProveedorTaller_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."ProveedorTaller_id_seq"', 1, false);


--
-- Name: StockPrenda_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."StockPrenda_id_seq"', 1, false);


--
-- Name: Talla_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."Talla_id_seq"', 1, false);


--
-- Name: Usuario_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."Usuario_id_seq"', 1, true);


--
-- Name: VentaDetalle_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."VentaDetalle_id_seq"', 1, false);


--
-- Name: Venta_id_seq; Type: SEQUENCE SET; Schema: textileria; Owner: postgres
--

SELECT pg_catalog.setval('textileria."Venta_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict USywfAHKHfoQXJYXriKZQ5bNwANXXAmmXTH0vRHjm5zKiW3eBeG3mLGUgcMYRSY

