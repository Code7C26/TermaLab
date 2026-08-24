# 🌡️ TermaLab: Termómetro Inteligente con App Integrada

[![Estado del Proyecto](https://img.shields.io/badge/Estado-En_Desarrollo-green)](#)
[![Tipo de Proyecto](https://img.shields.io/badge/Tipo-IoT%20%2B%20App-blue)](#)
[![Plataforma](https://img.shields.io/badge/Plataforma-Mobile%20%2B%20Hardware-orange)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg)](#)

> **Nota para el equipo:** Este repositorio contiene la documentación, planificación, diseño y desarrollo inicial de **TermaLab**, un dispositivo portátil de medición de temperatura conectado a una aplicación móvil. La organización del repositorio es clave para mantener ordenado el avance entre hardware, software, diseño y pruebas.

---

## 📖 Índice

1. [Descripción del Proyecto](#descripción-del-proyecto)
2. [Problema que Resuelve](#problema-que-resuelve)
3. [Solución Propuesta](#solución-propuesta)
4. [Público Objetivo](#público-objetivo)
5. [Stack Tecnológico y Hardware](#stack-tecnológico-y-hardware)
6. [Funcionalidades Clave](#funcionalidades-clave)
7. [Requisitos Previos](#requisitos-previos)
8. [Instalación y Configuración](#instalación-y-configuración)
9. [Estructura del Repositorio](#estructura-del-repositorio)
10. [Estado del Proyecto](#estado-del-proyecto)
11. [Equipo y Roles](#equipo-y-roles)
12. [Análisis FODA](#análisis-foda)
13. [Enlaces Importantes](#enlaces-importantes)

---

## 🚀 Descripción del Proyecto

**TermaLab** es un proyecto tecnológico basado en un dispositivo portátil capaz de medir temperatura y enviar los datos a una aplicación móvil. Su objetivo es facilitar el control de temperatura en situaciones cotidianas como cocinar, calentar agua para mate o monitorear líquidos y alimentos.

El sistema busca combinar hardware, conectividad inalámbrica y una interfaz simple para que el usuario pueda visualizar la temperatura en tiempo real y recibir alertas al alcanzar un valor objetivo.

---

## ❓ Problema que Resuelve

En el mercado argentino no abundan las opciones accesibles de termómetros inteligentes con aplicación integrada. Muchas personas deben controlar manualmente la temperatura de una comida, bebida o líquido, lo que puede generar errores, pérdida de tiempo o preparaciones que se pasan del punto deseado.

TermaLab responde a esta necesidad ofreciendo una solución práctica, portátil y adaptable a distintos usos cotidianos.

---

## 💡 Solución Propuesta

El proyecto propone desarrollar un **termómetro inteligente portátil** conectado a una aplicación móvil. El dispositivo mide la temperatura mediante un sensor, envía los datos al celular y permite al usuario controlar el proceso desde la app.

**Principales características de la solución:**

* Medición de temperatura en tiempo real.
* Conexión entre el dispositivo y el celular.
* Visualización clara de los datos en la aplicación.
* Configuración de una temperatura objetivo.
* Notificación o alerta al alcanzar la temperatura deseada.
* Diseño portátil y fácil de utilizar.
* Carcasa funcional para proteger los componentes.

---

## 👥 Público Objetivo

TermaLab está pensado para:

* Personas que cocinan y necesitan controlar temperaturas con mayor precisión.
* Usuarios que preparan mate y quieren calentar el agua a la temperatura ideal.
* Personas que buscan comodidad para no revisar manualmente una preparación.
* Estudiantes, makers o usuarios interesados en soluciones IoT aplicadas al hogar.
* Cualquier persona que necesite monitorear temperatura de forma simple y práctica.

---

## 🛠️ Stack Tecnológico y Hardware

**Software:**

* **Aplicación móvil:** interfaz para visualizar temperatura y recibir alertas.
* **Lenguajes posibles:** JavaScript, Python, C++ o el lenguaje requerido por el microcontrolador elegido.
* **Control de versiones:** Git & GitHub.
* **Documentación:** Markdown.

**Hardware principal:**

* Sensor de temperatura.
* Microcontrolador.
* Módulo de conectividad inalámbrica, como Bluetooth o Wi-Fi.
* Batería o sistema de alimentación simple.
* Carcasa diseñada e impresa en 3D.
* Componentes de conexión y protección del circuito.

---

## ✅ Funcionalidades Clave

- [ ] Medición de temperatura en tiempo real.
- [ ] Envío de datos desde el dispositivo al celular.
- [ ] Aplicación conectada al dispositivo.
- [ ] Visualización de la temperatura actual en la app.
- [ ] Configuración de una temperatura objetivo.
- [ ] Alerta o notificación cuando se alcance la temperatura deseada.
- [ ] Diseño portátil y fácil de usar.
- [ ] Carcasa funcional para proteger los componentes.
- [ ] Alimentación mediante batería o conexión simple.
- [ ] Lecturas estables y suficientemente precisas para uso práctico.

---

## ⚙️ Requisitos Previos

Antes de clonar o trabajar sobre el proyecto, se recomienda tener instalado o disponible:

* [Git](https://git-scm.com/)
* Cuenta de GitHub.
* Editor de código, como Visual Studio Code.
* Entorno de desarrollo para el microcontrolador elegido.
* Herramienta para diseño 3D, en caso de modificar la carcasa.
* Dispositivo móvil para probar la aplicación.
* Componentes electrónicos necesarios para el prototipo.

---

## 📦 Instalación y Configuración

Para clonar el repositorio:

```bash
git clone url-del-repositorio
cd termalab
```

Luego, abrir la carpeta del proyecto en el editor de código:

```bash
code .
```

Según la parte del proyecto que se quiera probar, revisar las carpetas correspondientes:

* `/src` para el código fuente.
* `/docs` para la documentación.
* `/assets` para imágenes, diseños o prototipos.
* `/hardware` para archivos relacionados con componentes, conexiones o carcasa.

---

## 📁 Estructura del Repositorio

```bash
termalab/
│
├── docs/              # Documentación general del proyecto
├── src/               # Código fuente de la app o firmware
├── assets/            # Imágenes, logos, bocetos y recursos visuales
├── hardware/          # Diagramas, modelos 3D y componentes
├── tests/             # Pruebas del dispositivo o de la aplicación
└── README.md          # Presentación principal del proyecto
```

---

## 📌 Estado del Proyecto

Actualmente, TermaLab se encuentra en etapa inicial de planificación y desarrollo.

**Avances actuales:**

* Definición del problema y la solución.
* Identificación del público objetivo.
* Planificación del producto mínimo viable.
* Análisis de funcionalidades principales.
* Evaluación de componentes necesarios.
* Primeras ideas de diseño para el dispositivo y la aplicación.

**Próximos pasos:**

* Elegir el sensor de temperatura.
* Definir si la conexión será por Bluetooth o Wi-Fi.
* Seleccionar el microcontrolador.
* Diseñar un primer boceto de la app.
* Desarrollar un prototipo básico funcional.
* Realizar pruebas de medición y estabilidad.

---

## 👨‍💻 Equipo y Roles

| Nombre | Rol | GitHub |
|---|---|---|
| Integrante 1 | Diseño y armado del prototipo | @usuario |
| Integrante 2 | Programación o investigación de la app | @usuario |
| Integrante 3 | Modelado e impresión 3D de la carcasa | @usuario |
| Integrante 4 | Pruebas del dispositivo | @usuario |
| Integrante 5 | Organización general y presentación | @usuario |

---

## 📊 Análisis FODA

### Fortalezas

* Producto portátil, preciso e innovador.
* Útil para distintos usos, como mate, carnes y cocina.
* Posibilidad de crear una carcasa personalizada con impresión 3D.
* Equipo con predisposición para aprender y desarrollar el proyecto.

### Oportunidades

* Mercado amplio para soluciones prácticas de medición de temperatura.
* Poca producción local de este tipo de dispositivos en Argentina.
* Posibilidad de agregar nuevas funciones en el futuro.
* Acceso a asesoramiento técnico y entornos reales de prueba.

### Debilidades

* Falta de experiencia previa en algunas áreas técnicas.
* Dependencia de batería y aplicación móvil.
* Necesidad de resistencia al calor y humedad.
* Curva de aprendizaje durante el desarrollo.

### Amenazas

* Competencia de productos más simples y económicos.
* Posibles fallas técnicas durante el desarrollo.
* Costos imprevistos de materiales o componentes.
* Dependencia de ayuda externa en temas específicos.

---

## 🔗 Enlaces Importantes

* **Pitch del proyecto:** pendiente.
* **Prototipo:** pendiente.
* **Publicación:** pendiente.
* **Documentación:** `/docs`.
* **Repositorio:** pendiente.

---

## 📝 Licencia

Este proyecto se encuentra en desarrollo con fines educativos. La licencia definitiva será definida por el equipo.
