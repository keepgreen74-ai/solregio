SOLREGIO V5 - LISTO PARA VERCEL

Contenido:
- index.html = página principal
- cotizador.html = captura y cálculo
- presentacion.html = presentación para cliente / PDF
- styles.css = estilos
- app.js = scroll suave del sitio
- cotizador.js = lógica del cotizador
- presentacion.js = lógica de presentación
- logo-solregio-claro.jpg = logotipo
- vercel.json = configuración recomendada para Vercel

Cómo subir a Vercel:
1. Entra a Vercel y crea un proyecto nuevo.
2. Sube TODO el contenido de esta carpeta.
3. Framework Preset: Other.
4. Root Directory: esta misma carpeta.
5. Deploy.

Notas:
- No necesitas compilar nada.
- Es un sitio estático y debe funcionar directo en Vercel.
- El cotizador guarda la información en el navegador usando localStorage.

Uso de la presentación:
1. Abre cotizador.html
2. Captura los datos
3. Da clic en "Guardar y actualizar"
4. Luego abre presentacion.html

Para PDF:
- Desde presentacion.html da clic en "Exportar PDF"
- En Chrome activa "Gráficos de fondo"
- Desactiva "Encabezados y pies de página"
