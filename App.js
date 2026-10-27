// ===== Clase Tarea: representa una tarea individual =====
class Tarea {
  constructor(nombre, completa = false, id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`) {
    this.id = id;
    this.nombre = nombre;
    this.completa = completa; // true = completa, false = incompleta
  }

  // Actualiza el estado; si no recibe valor, lo invierte
  actualizarEstado(completa = !this.completa) {
    this.completa = completa;
  }

  // Cambia el nombre de la tarea
  editar(nuevoNombre) {
    this.nombre = nuevoNombre;
  }

  // Devuelve la lista sin esta tarea
  eliminar(lista) {
    return lista.filter((tarea) => tarea.id !== this.id);
  }
}

// ===== Clase GestorDeTareas: guarda la lista y la persiste en LocalStorage =====
class GestorDeTareas {
  constructor(clave = "gestor-de-tareas") {
    this.clave = clave;
    this.tareas = this.cargar();
  }

  cargar() {
    try {
      const datos = JSON.parse(localStorage.getItem(this.clave)) ?? [];
      return datos.map(({ nombre, completa, id }) => new Tarea(nombre, completa, id));
    } catch (error) {
      console.error("No se pudieron cargar las tareas:", error);
      return [];
    }
  }

  guardar() {
    localStorage.setItem(this.clave, JSON.stringify(this.tareas));
  }

  obtener(id) {
    return this.tareas.find((tarea) => tarea.id === id);
  }

  // Devuelve un mensaje de error, o "" si el nombre es válido
  validar(nombre, ignorarId = null) {
    if (nombre === "") return "Escribe el nombre de la tarea antes de guardarla.";
    const repetida = this.tareas.some(
      (tarea) => tarea.id !== ignorarId && tarea.nombre.toLowerCase() === nombre.toLowerCase()
    );
    return repetida ? "Esa tarea ya existe en tu lista." : "";
  }

  agregarTarea(nombre) {
    const limpio = nombre.trim();
    const error = this.validar(limpio);
    if (error) return error;
    this.tareas.push(new Tarea(limpio));
    this.guardar();
    return "";
  }

  editarTarea(id, nombre) {
    const limpio = nombre.trim();
    const error = this.validar(limpio, id);
    if (error) return error;
    this.obtener(id).editar(limpio);
    this.guardar();
    return "";
  }

  alternarEstado(id) {
    this.obtener(id).actualizarEstado();
    this.guardar();
  }

  eliminarTarea(id) {
    this.tareas = this.obtener(id).eliminar(this.tareas);
    this.guardar();
  }
}

// ===== Interfaz: manipulación del DOM =====
const gestor = new GestorDeTareas();
let editandoId = null; // id de la tarea que se está editando (o null)

const formulario = document.querySelector("#formulario-tarea");
const entrada = document.querySelector("#nueva-tarea");
const lista = document.querySelector("#lista-tareas");
const mensaje = document.querySelector("#mensaje");
const contador = document.querySelector("#contador");
const vacio = document.querySelector("#vacio");

// Evita que texto escrito por el usuario se interprete como HTML
const escaparHTML = (texto) =>
  texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const mostrarMensaje = (texto, exito = false) => {
  mensaje.textContent = texto;
  mensaje.classList.toggle("exito", exito);
};

// Genera el HTML de una tarea con template literals
const plantilla = ({ id, nombre, completa }) => {
  if (id === editandoId) {
    return `
      <li class="tarea" data-id="${id}">
        <input type="text" class="entrada-edicion" value="${escaparHTML(nombre)}" maxlength="80" aria-label="Editar nombre de la tarea">
        <div class="acciones">
          <button type="button" data-accion="guardar">Guardar</button>
          <button type="button" data-accion="cancelar">Cancelar</button>
        </div>
      </li>`;
  }
  return `
    <li class="tarea ${completa ? "completa" : ""}" data-id="${id}">
      <input type="checkbox" data-accion="estado" ${completa ? "checked" : ""} aria-label="Marcar como completa: ${escaparHTML(nombre)}">
      <span class="nombre">${escaparHTML(nombre)}</span>
      <div class="acciones">
        <button type="button" data-accion="editar">Editar</button>
        <button type="button" class="eliminar" data-accion="eliminar">Eliminar</button>
      </div>
    </li>`;
};

// Vuelve a pintar toda la lista cada vez que cambian los datos
const render = () => {
  lista.innerHTML = "";
  gestor.tareas.forEach((tarea) => lista.insertAdjacentHTML("beforeend", plantilla(tarea)));

  const total = gestor.tareas.length;
  const hechas = gestor.tareas.filter((tarea) => tarea.completa).length;
  vacio.hidden = total > 0;
  contador.textContent = total > 0 ? `${hechas} de ${total} tareas completas` : "";

  const campoEdicion = lista.querySelector(".entrada-edicion");
  if (campoEdicion) campoEdicion.focus();
};

// Agregar tarea
formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const error = gestor.agregarTarea(entrada.value);
  if (error) {
    mostrarMensaje(error);
    entrada.focus();
    return;
  }
  mostrarMensaje("Tarea agregada.", true);
  entrada.value = "";
  render();
  entrada.focus();
});

const guardarEdicion = (id, li) => {
  const error = gestor.editarTarea(id, li.querySelector(".entrada-edicion").value);
  if (error) {
    mostrarMensaje(error);
    return;
  }
  editandoId = null;
  mostrarMensaje("Tarea actualizada.", true);
  render();
};

// Delegación de eventos: un solo listener para todos los botones de la lista
lista.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-accion]");
  if (!boton || boton.type === "checkbox") return;
  const li = boton.closest("li");
  const id = li.dataset.id;

  const acciones = {
    editar: () => { editandoId = id; mostrarMensaje(""); render(); },
    cancelar: () => { editandoId = null; mostrarMensaje(""); render(); },
    guardar: () => guardarEdicion(id, li),
    eliminar: () => { gestor.eliminarTarea(id); mostrarMensaje("Tarea eliminada.", true); render(); },
  };
  acciones[boton.dataset.accion]?.();
});

// Marcar o desmarcar como completa
lista.addEventListener("change", (evento) => {
  if (evento.target.dataset.accion !== "estado") return;
  gestor.alternarEstado(evento.target.closest("li").dataset.id);
  render();
});

// Enter guarda y Escape cancela mientras se edita
lista.addEventListener("keydown", (evento) => {
  if (!evento.target.classList.contains("entrada-edicion")) return;
  const li = evento.target.closest("li");
  if (evento.key === "Enter") guardarEdicion(li.dataset.id, li);
  if (evento.key === "Escape") { editandoId = null; render(); }
});

render();