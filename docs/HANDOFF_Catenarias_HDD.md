# HANDOFF · Cálculo de Catenarias HDD
Fecha: 2026-11-19 · Responsable: Sebastian (Torreón, Coah.) · Estado: v2.1 entregada, v3 pendiente de una decisión

## 0. Cómo usar este documento en otra herramienta
1. Pegar este archivo completo como contexto inicial.
2. Adjuntar el último libro disponible: **Catenarias_HDD_v2.1.xlsx** (si no, v2). El `Catenarias_HDD.xlsx` del proyecto es la **v1 (obsoleta)**.
3. Adjuntar el archivo manual de referencia (`CCA 01 PHD 02-11-2026 leo`, hojas `CCA 01 OPCION A` y `CCA 01 OPCION PSV 2 APL`).
4. Reglas de trabajo: no inventar datos; dato sin fuente = "POR CONFIRMAR"; entregar archivos completos; metas alcanzables; trato: "Sebastian".

---

## 1. Objetivo
Libro de Excel (fórmulas; macros solo para botones) que:
- Calcule la catenaria HDD automáticamente, barra por barra.
- Grafique terreno, trayectoria (eje y lomo), cobertura, ventanas y obstáculos.
- Soporte varios escenarios y materiales: acero, HDPE, acero con camisa A-500.
- Dictamine si la distancia entre ventanas es suficiente y dé ángulos/pendientes de entrada y salida.
- Entregue PDF de presentación y Excel sin fórmulas (solo resultados).

## 2. Historial de versiones
| Versión | Estado | Motor | Notas |
|---|---|---|---|
| v1 (`Catenarias_HDD.xlsx`, proyecto) | Obsoleta | Recta–arco–recta continuo, R único | Hojas PLANTILLA, CATALOGO, MAQUINAS, MACRO_VBA |
| v2 (2026-11-09) | Base visual | Recta–arco–centro recto–arco–recta; prueba todas las combinaciones de pendiente entera | 30,808 fórmulas, 0 errores, 32/32 pruebas vs motor Python |
| v2.1 (2026-11-17) | Última entregada | Barra por barra, pendientes enteras, cambio gradual | 104,285 fórmulas, 0 errores; validada solo en LibreOffice |
| v3 | Pendiente | v2.1 + obstáculos + escalones + botones | Formato visual de v2 |

---

## 3. Parámetros de entrada
| Bloque | Parámetro | Valor / regla |
|---|---|---|
| Proyecto | Nombre, cruce, referencia, fecha | Captura |
| Terreno | Cadenamiento + cota | Captura @10 m; tabla interpolada @5 m |
| Ventanas | Cepa cúbica | 2.50 m de lado |
| Ventanas | 0+000 | Centro de ventana de entrada |
| Ventanas | Último cadenamiento | Centro de ventana de salida |
| Ventanas | Prof. punto entrada/salida | 2.50 m (supuesto, confirmar) |
| Cobertura | Mínima bajo terreno | 1.50 m típico (caso Cruce 10) |
| Cobertura | Referencia | Eje o lomo, seleccionable |
| Obstáculos | Cadenamiento, cota, Ø | Separación mínima 2.00 m |
| Tubería | Catálogo | Ver §6 |
| Camisa | Catálogo A-500 Ced. 20/40 o SIN CAMISA | Se jala primero la camisa; luego la conducción dentro, misma máquina |
| Máquina | ℓ barra, radio mín., ángulos, n.º barras | Ver §7 |
| Modo | AUTOMÁTICO / MANUAL | MANUAL = pendiente por barra capturada |
| Máquina | Ubicación | AUTOMÁTICO (extremo bajo), INICIO o FINAL |

---

## 4. Fórmulas

### 4.1 Cadenamiento y terreno
- Texto `k+mmm.mm` → metros: $x = 1000\,k + m$
- Interpolación lineal: $z(x) = z_i + (z_{i+1}-z_i)\dfrac{x-x_i}{x_{i+1}-x_i}$
- Estaciones: $N_{est} = \lceil L/\ell \rceil + 1$, con $x_j = \min(j\,\ell,\;L)$

### 4.2 Radio mínimo
- Acero (planeación API/Trenchless, no código): $R_{acero} = 1200\,\varnothing_{ext}$ ($100\,\text{ft}/\text{in}$). 16" → 487.7 m; 12" → 365.8 m
- HDPE: $R_{PE} = k\,\varnothing_{ext}$, $k = 25$ (PPI, DR 11) a $27$ (DuraLine SDR 17–21); en libro: 27
- Barra: $R_{barra} \approx \dfrac{\ell}{\arctan(\Delta\%)}$
- Rige: $R_{min} = \max(R_{tubo},\,R_{barra})$; $R_{diseño}$ opcional $\geq R_{min}$
- Esfuerzo de flexión (acero): $\sigma = \dfrac{E\,D}{2R}$, $E = 200$ GPa
  - 16" X70 (SMYS 483 MPa): R 488 m → 83 MPa (17 %); R 217 m → 187 MPa (39 %); R 145 m → 281 MPa (58 %)
  - **% SMYS admisible: POR CONFIRMAR** (no se encontró en fuente abierta)

### 4.3 Motor v1 (recta–arco–recta, referencia geométrica)
Con $\alpha$ entrada, $\beta$ salida, $\Delta z = z_{ent}-z_{sal}$:
$$B = \Delta z - R(\cos\beta - \cos\alpha)$$
$$L_{req} = R(\sin\alpha+\sin\beta) + \max\!\left(\frac{-B}{\tan\beta},\ \frac{B}{\tan\alpha}\right)$$
$$A = L - R(\sin\alpha+\sin\beta),\quad L_1 = \frac{A\sin\beta + B\cos\beta}{\sin(\alpha+\beta)},\quad L_2 = \frac{A\sin\alpha - B\cos\alpha}{\sin(\alpha+\beta)}$$
- Cierra si $L_1 \geq 0$ y $L_2 \geq 0$
- Cota mínima: $z_{min} = z_{arco,0} - R(1-\cos\alpha)$
- $\Delta\theta_{barra} = \ell/R$ (rad); $\Delta\%_{barra} = 100\tan(\ell/R)$

### 4.4 Motor v2.1 (barra por barra, vigente)
Pendiente entera de la barra $j$ (entrada $e$, salida $s$, cambio por barra $d$, tope $u$, $a$ barras rectas de entrada, $N$ barras):
$$p_j = \begin{cases} e & j \leq a \\ \min\big(u,\; e + d(j-a),\; s + d(N-j)\big) & j > a \end{cases}$$
- Cota: $z_{j} = z_{j-1} + \ell \cdot p_j/100$ (Δz por barra = ℓ × pendiente, Vermeer)
- Profundidad: $h_j = z_{terreno}(x_j) - z_j$; lomo: $h_{lomo} = h_{eje} - \varnothing/2$
- AUTOMÁTICO: pendientes enteras (calculadas como enteros, no por formato), cambios graduales ≤ Δ máx. por barra
- Selección: primero salida más horizontal, luego menor longitud
- Chequeo de cobertura/obstáculos en vértices de terreno y bordes de ventana (no muestreado)

### 4.5 Retroensanche y masa
- Usuario: $\varnothing_{ens} = 2.0\,\varnothing$ (acero/camisa); $1.8\,\varnothing$ (HDPE)
- Referencia: API 1.5×OD (< 24"), OD+12" (≥ 24"); PPI 1.2–1.5×OD
- Masa: $m = \dfrac{\pi}{4}(\varnothing_e^2 - \varnothing_i^2)\,\rho$; $\rho_{acero} = 7850$, $\rho_{PE} = 955$ kg/m³
- HDPE: $e = \varnothing_e/SDR$
- Holgura camisa–tubería: $\varnothing_{i,camisa} - \varnothing_{e,tubo} \geq 50$ mm

### 4.6 Jalado
- Regla de campo (en v2.1, sin respaldo bibliográfico): $W\cdot L \leq 0.75\,F_{máq}$
- PPI/ASTM F1962 (HDPE): $F = e^{\mu\theta}\mu\,w_N L$; $\mu$ = 0.5 superficie, 0.1 rodillos, 0.3 barreno
- Arrastre hidrocinético: $\Delta F = P\frac{\pi}{8}(D_h^2 - OD^2)$, $P \approx 10$ psi
- Acero (PRCI): no encontrado

---

## 5. Criterios de campo (Sebastian y asesores)
| Criterio | Regla |
|---|---|
| Distancia | Ejecutar dentro de la propuesta; aumentarla es raro y debe ser poco |
| Pendientes | Enteras; cambios entre barras graduales, no drásticos |
| Entrada | Catenaria inicia a nivel de terreno en 0+000 |
| Salida | Lo más horizontal posible; máx. 2 % |
| Gravedad | Máquina en extremo bajo; jalado de arriba hacia abajo |
| Barras | Capacidad = máximo de todo el tiro, no solo las de la máquina |
| Tramo central | Recto si se cumplen radios (tiros largos) |
| Obstáculos | Librar con ≥ 2.00 m |
| Desnivel | PPI: evitar > 15.2 m entre extremos |
| Cobertura MX | NOM-007-SECRE-2010 (solo gas): carretera 0.90 m suelo / 0.60 roca; FFCC 1.20; agua 1.20 / 0.60 (a lomo). NOM-020-ASEA-2024: pendiente revisar |

---

## 6. Catálogo
| Descripción | Material | Ø ext mm | e mm | Uso |
|---|---|---|---|---|
| 16" X70 e=0.344" | Acero | 406.4 | 8.738 | Anillo Periférico Laguna |
| 12" X70 e=0.297" | Acero | 323.9 | 7.544 | Anillo Periférico (camisa 16" Ced 20) |
| 6" X42 e=0.219" | Acero | 168.3 | 5.563 | Culiacán (camisa 10" Ced 20) |
| 8" HDPE SDR 11 | HDPE | 219.1 | Ø/11 | ALUMCAST (camisa 12" Ced 40) |
| 2" HDPE SDR 11 | HDPE | 60.3 | Ø/11 | Durango, sin camisa |
| 110 mm PE100 | HDPE | 110 | SDR **POR CONFIRMAR** (11 marcador) | Mazatlán (camisa 8" Ced 40) |
| 160 mm PE100 | HDPE | 160 | SDR **POR CONFIRMAR** | Mazatlán (camisa 10" Ced 40) |

| Camisa A-500 | Ø ext mm | e mm |
|---|---|---|
| 20" Ced 20 | 508.0 | 9.525 |
| 20" Ced 40 | 508.0 | 15.088 |
| 16" Ced 20 | 406.4 | 7.925 |
| 12" Ced 40 | 323.9 | 10.312 |
| 10" Ced 20 | 273.1 | 6.350 |
| 10" Ced 40 | 273.1 | 9.271 |
| 8" Ced 40 | 219.1 | 8.179 |
Espesores ASME B36.10M: verificar contra catálogo del proveedor.

## 7. Máquinas (fichas Ditch Witch)
| Máquina | Radio mín. barra | ℓ barra | Tiro |
|---|---|---|---|
| JT5 | 21.3 m | 1.50 m | 5,000 lb |
| AT32 (2024) | 37.5–39.6 m | 3.05 m | 32,000 lb |
| AT40 (2024) | 45–52 m | 4.57 m | 40,000 lb |
| JT60 | 52 m | 4.57 m | 60,000 lb |
| AT60 (2019) | 62.5 m | 4.34 m | 60,000 lb |
| JT100 | 62.5 m | 4.50 m | 100,000 lb |
| AT100 (2019) | 62.5 m | 4.31 m | 100,000 lb |
- Δ máx por barra: JT60 ≤ 7 %; Vermeer hasta 10 %/10 ft
- POR CONFIRMAR: ángulos de entrada AT40 (20–29°) y JT100 (tomado de AT100); **n.º de barras por máquina** (JT100 = 12 en tabla, casos usan 28 y 19)

---

## 8. Resultados obtenidos
| Caso | Datos | Resultado |
|---|---|---|
| Cruce 10 Anillo Periférico | 16" X70, sin camisa, AT100, L 120 m, cobertura 1.50 m | **No cierra a 120 m**. Salida ≤ 2 % → ≥ 391 m; salida ≤ 12 % → ≥ 166 m (v2) |
| Ejemplo v1 | Mismo tubo, L 125 m, α 8°, β 5°, R 488 m | Cierra: L req 123.64 m, L1 0.53 m, L2 14.16 m, cobertura mín 2.85 m, prof. máx 13.46 m |
| PSV 2 APL (manual) | MANUAL | Dif. máx 2 mm; prof. máx 8.97 / 8.97 m |
| PSV 2 APL | AUTOMÁTICO | Dif. 0.17 m; mismas pendientes: −22 %, +2 en +2 hasta +10 %, sale +2 % |
| Panteones A | MANUAL | Dif. 1.29 m solo barra 10 (manual ignora talud en 44.5 m) |
| Panteones A | AUTOMÁTICO | Dif. 0.81 m; manual usa dos escalones (−26 %, −24 %) |
| Panteones A | Máquina en extremo bajo | **No cierra**: sube 14.8 m en 82 m; entrada mín. 10° + cambio gradual pierden profundidad |

Estado REVISAR en v2.1 por datos, no por cálculo: n.º de barras, terreno PSV llega a 120 m vs tiro 121.52 m (se extiende última cota), % SMYS vacío.

---

## 9. Pendientes para v3
| # | Tarea | Bloqueo |
|---|---|---|
| 1 | **Decidir gravedad en terreno inclinado**: (a) excepción de entrar por extremo alto con desnivel fuerte, o (b) permitir mayor Δ por barra solo en ese tramo | Sebastian |
| 2 | Confirmar n.º de barras por máquina | Sebastian |
| 3 | Fijar % SMYS admisible en flexión | Responsable técnico |
| 4 | SDR real de 110 y 160 mm PE100 | Proyecto Mazatlán |
| 5 | Obstáculos con separación 2 m en el motor barra por barra | — |
| 6 | Segundo escalón de pendiente (seguir talud) | — |
| 7 | Botón PDF: gráfica, tabla de estaciones, proyecto y cruce | — |
| 8 | Botón Excel sin fórmulas (solo resultados) | — |
| 9 | Columnas finales de la tabla de estaciones | Sebastian |
| 10 | Probar en Excel real (hasta ahora solo LibreOffice) | — |
| 11 | Futuro: planeado vs. real, azimut, jalado con flotación | — |

Esto funcionará para: continuar la v3 en cualquier herramienta con capacidad de leer/escribir .xlsx (Claude Code, Claude in Excel, ChatGPT/Copilot con archivos), siempre que se adjunte la v2.1.

## Fuentes
- API HDD Operations White Paper · PPI Handbook cap. 12 · DuraLine IB 19-4.1 · Trenchless Technology (bend radius) · Manual Ditch Witch JT60/JT60AT · Fichas Ditch Witch · Vermeer ProTips (bore plan) · The Driller, HDD Good Practice · NOM-007-SECRE-2010 (DOF)
- Detalle y URLs: `claude/investigacion_catenarias_HDD.md` (doc del proyecto)
