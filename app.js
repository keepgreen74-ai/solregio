
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
function guardarCliente(data) {

  let clientes = JSON.parse(localStorage.getItem("clientes")) || [];

  clientes.push({
    id: Date.now(),
    fecha: new Date().toLocaleDateString(),
    ...data,
    estatus: "nuevo"
  });

  localStorage.setItem("clientes", JSON.stringify(clientes));

  alert("Cliente guardado correctamente");
}