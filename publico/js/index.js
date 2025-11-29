document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN CENTRALIZADA ---
    // Modifica estos valores para actualizar todo el sitio.
    const CONTACT_INFO = {
        // IMPORTANTE: Reemplaza con tu número real (código de país + número, sin '+' ni espacios)
        whatsappNumber: '5491123039253', 
        whatsappDisplay: '+54 11 2303-9253', // Cómo se muestra en la web
        // IMPORTANTE: Reemplaza con tu email real
        email: 'Alejandratarifa85@gmail.com'
    };

    // --- CONFIGURACIÓN DE CATEGORÍAS ---
    // Para desactivar una categoría, cambia 'enabled' a 'false'.
    const CATEGORIES_CONFIG = {
        'extensiones':    { name: 'EXTENSIONES',     enabled: true },
        'efecto_foxy':    { name: 'EFECTO FOXY',     enabled: true },
        'efecto_anime':   { name: 'EFECTO ANIME',    enabled: true },
        'efecto_bratzz':  { name: 'EFECTO BRATZZ',   enabled: true },
        'cejas':          { name: 'CEJAS',           enabled: true },
        'lifting':        { name: 'LIFTING PREMIUM', enabled: true },
        'uñas':           { name: 'UÑAS',            enabled: false},
    };

    // --- SELECTORES DE ELEMENTOS DEL DOM ---
    const menuButton = document.getElementById('menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const bookingForm = document.getElementById('booking-form');
    const pageContainer = document.getElementById('page-container');
    const galleryModal = document.getElementById('gallery-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const savedDesignsContainer = document.getElementById('saved-designs-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const searchForms = document.querySelectorAll('.search-form');
    const searchResultsHeader = document.getElementById('search-results-header');
    const searchResultsContainer = document.getElementById('search-results-container');
    const pageContents = document.querySelectorAll('.page-content');
    const designsDropdownButton = document.getElementById('designs-dropdown-button');
    const designsDropdownMenu = document.getElementById('designs-dropdown-menu');
    const mobileDesignsMenu = document.getElementById('mobile-designs-menu');
    // Nuevos selectores para el visualizador de galería
    const galleryImage = document.getElementById('gallery-image');
    const prevImageButton = document.getElementById('prev-image-button');
    const nextImageButton = document.getElementById('next-image-button');

    let currentGalleryImages = [];
    let currentGalleryIndex = 0;

    // Lista de categorías activas para la búsqueda y renderizado
    const ACTIVE_CATEGORIES = Object.keys(CATEGORIES_CONFIG).filter(key => CATEGORIES_CONFIG[key].enabled);

    // --- 1. FUNCIÓN DE NAVEGACIÓN (SPA) ---
    async function showPage(pageId) {
        loadingOverlay.classList.remove('hidden');

        try {
            // Si es una página de catálogo, carga su contenido dinámicamente
            if (pageId.startsWith('sub_')) {
                const category = pageId.substring(4); // ej: 'extensiones'
                const containerId = `${category}-container`;
                await loadCatalog(category, containerId);
            }

            pageContents.forEach(section => section.classList.add('hidden'));
            const targetPage = document.querySelector(`[data-page="${pageId}"]`);
            if (targetPage) {
                targetPage.classList.remove('hidden');
                if (pageId === 'contacto') {
                    renderSavedDesigns();
                }
            }

            // Actualiza el estilo del enlace activo
            const navLinks = document.querySelectorAll('.nav-link, .nav-link-mobile');
            navLinks.forEach(link => {
                link.classList.toggle('active-link', link.getAttribute('data-page-id') === pageId);
            });

        } catch (error) {
            console.error("Error al mostrar la página:", error);
        } finally {
            // Oculta la pantalla de carga, incluso si hay un error
            loadingOverlay.classList.add('hidden');
        }
    }

    // Nueva función para manejar el enrutamiento basado en el hash de la URL
    async function handleRouteChange() {
        // Decodifica el hash para manejar correctamente caracteres especiales como 'ñ'
        const pageId = decodeURIComponent(window.location.hash.substring(1));

        // Si el modal está abierto y el hash cambia a algo que no es 'gallery', cierra el modal.
        // Esto maneja el botón "atrás" del navegador.
        if (galleryModal.classList.contains('hidden') === false && pageId !== 'gallery') {
            closeModal(false); // Cierra sin manipular el historial
        }

        if (pageId.startsWith('buscar=')) {
            const searchTerm = decodeURIComponent(pageId.substring(7));
            await performSearch(searchTerm);
            return; // La búsqueda maneja su propia visualización de página
        }

        // Si el hash es 'gallery', no hagas nada, deja que el modal se gestione por sí mismo.
        if (pageId === 'gallery') {
            return;
        }

        // Si el hash está vacío o no corresponde a una página, se muestra 'inicio' por defecto.
        const targetPage = document.querySelector(`[data-page="${pageId}"]`);
        await showPage(targetPage ? pageId : 'inicio');
    }

    // --- 2. MANEJADORES DE EVENTOS ---
    // Usamos delegación de eventos en el header para manejar clics en enlaces estáticos y dinámicos
    document.querySelector('header').addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link, .nav-link-mobile');
        if (!link) return;

        e.preventDefault();
        const pageId = link.getAttribute('data-page-id');
        
        if (pageId) {
            window.location.hash = pageId;
            
            if (designsDropdownMenu && !designsDropdownMenu.classList.contains('hidden')) {
                designsDropdownMenu.classList.add('hidden');
            }

            mobileMenu.classList.add('hidden');
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // --- MANEJADOR PARA EL MENÚ DESPLEGABLE DE DISEÑOS ---
    if (designsDropdownButton) {
        designsDropdownButton.addEventListener('click', (e) => {
            // Detiene la propagación para que el listener de 'window' no lo cierre inmediatamente
            e.stopPropagation();
            designsDropdownMenu.classList.toggle('hidden');
        });
    }

    // Evita que el menú se cierre al hacer clic dentro de él
    if (designsDropdownMenu) {
        designsDropdownMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    searchForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = form.querySelector('.search-input');
            const searchTerm = input.value.trim();
            if (searchTerm) {
                window.location.hash = `buscar=${encodeURIComponent(searchTerm)}`;
                input.value = ''; // Limpiar el input después de buscar
            }
        });
    });

    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const submitButton = bookingForm.querySelector('button[type="submit"]');
            const originalButtonHTML = submitButton.innerHTML;

            // 1. Mostrar animación de carga y deshabilitar el botón
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading-spinner mx-auto"></div>';

            // Obtener los valores del formulario
            const name = document.getElementById('input-name').value;
            const email = document.getElementById('input-email').value;
            const message = document.getElementById('input-message').value;

            const savedDesigns = JSON.parse(localStorage.getItem('savedDesigns')) || [];
            let designsText = '';
            if (savedDesigns.length > 0) {
                designsText = '\n*Mis Diseños Seleccionados:*\n' + savedDesigns.map(d => `• ${d.title} (${d.price})`).join('\n');
            }

            const whatsappMessage = `
*--- SOLICITUD DE CITA ---*

¡Hola BL-studio! Me gustaría reservar una cita.

*Mi nombre es:* ${name}${designsText}

*Horario/Día preferido:* ${message}
${email ? `*Email:* ${email}` : ''}

Por favor, confírmenme la disponibilidad. ¡Gracias!
            `.trim();

            const encodedMessage = encodeURIComponent(whatsappMessage);
            const whatsappLink = `https://wa.me/${CONTACT_INFO.whatsappNumber}?text=${encodedMessage}`;
            
            // 2. Abrir el enlace en una nueva pestaña
            window.open(whatsappLink, '_blank');

            // 3. Limpiar el localStorage y la UI
            localStorage.removeItem('savedDesigns');
            renderSavedDesigns(); // Actualiza la lista de diseños en la página

            // 4. Restaurar el botón después de un breve retraso
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHTML;
            }, 2000); // 2 segundos para dar tiempo a que el usuario vea la acción
        });
    }

    menuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // --- 3. LÓGICA DEL CATÁLOGO DINÁMICO ---
    async function loadCatalog(category, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Si el catálogo ya ha sido cargado, no lo cargues de nuevo.
        // Esto evita recargas innecesarias al volver a una pestaña ya visitada.
        if (container.innerHTML.trim() !== '') return;

        try {
            const response = await fetch(`data/${category}.json`);
            const services = await response.json();

            let html = '';
            services.forEach(service => {
                const hasImages = service.images && service.images.length > 0;

                html += `
                    <div class="catalog-card bg-gray-50 rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                        <div class="w-full h-48 bg-gray-300 flex items-center justify-center text-accent text-xl font-bold" 
                             style="background-image: url('${hasImages ? service.images[0] : 'https://via.placeholder.com/400x300.png/f3f4f6/cbd5e1?text=BL-studio'}'); background-size: cover; background-position: center;">
                        </div>
                        <div class="p-5 flex-grow flex flex-col">
                            <h4 class="text-2xl font-semibold primary-color mb-2">${service.title}</h4>
                            <p class="text-gray-600 text-sm mb-4 flex-grow">${service.description}</p>
                            
                            ${service.price ? `<div class="mb-4 text-center">
                                <p class="text-2xl font-bold text-gray-800">${service.price}</p>
                            </div>` : ''}

                            <div class="mt-auto grid grid-cols-2 gap-2">
                                <button 
                                    class="save-design-button w-full text-sm font-medium py-2.5 rounded-lg transition primary-bg text-white primary-hover"
                                    data-id="${category}-${service.id}" data-title="${service.title}" data-price="${service.price}">
                                    Guardar Diseño
                                </button>
                                <button 
                                    class="gallery-button w-full text-sm font-medium py-2.5 rounded-lg transition ${hasImages ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}"
                                    ${hasImages ? `data-images="${service.images.join(',')}"` : 'disabled'}>
                                    Ver Fotos
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } catch (error) {
            console.error(`Error al cargar el catálogo para ${category}:`, error);
            container.innerHTML = `<p class="text-red-500">Error al cargar los servicios. Inténtalo de nuevo más tarde.</p>`;
        }
    }

    // --- 4. LÓGICA DE LA GALERÍA MODAL ---
    pageContainer.addEventListener('click', (e) => {
        const target = e.target;

        // Lógica para guardar diseño
        if (target.classList.contains('save-design-button')) {
            const design = {
                id: target.dataset.id,
                title: target.dataset.title,
                price: target.dataset.price
            };

            let savedDesigns = JSON.parse(localStorage.getItem('savedDesigns')) || [];
            // Evitar duplicados
            if (!savedDesigns.some(d => d.id === design.id)) {
                savedDesigns.push(design);
                localStorage.setItem('savedDesigns', JSON.stringify(savedDesigns));
                target.textContent = '¡Guardado!';
                target.disabled = true;
                setTimeout(() => { target.textContent = 'Guardar Diseño'; target.disabled = false; }, 2000);
            }
        }

        if (target.classList.contains('gallery-button')) {
            const images = target.dataset.images.split(',');
            if (images.length > 0 && images[0]) {
                // 1. Mostrar pantalla de carga
                loadingOverlay.classList.remove('hidden');

                // 2. Esperar 2 segundos para simular la carga
                setTimeout(() => {
                    // 3. Ocultar la carga y abrir el modal
                    loadingOverlay.classList.add('hidden');
                    openModal(images);
                }, 2000);
            }
        }
    });

    closeModalButton.addEventListener('click', () => closeModal());
    galleryModal.addEventListener('click', (e) => {
        // Cierra el modal si se hace clic en el fondo oscuro (el contenedor principal del modal)
        if (e.target === galleryModal) {
            closeModal();
        }
    });

    // --- NUEVA LÓGICA DE GALERÍA AVANZADA ---

    function showGalleryImage(index) {
        if (!currentGalleryImages || currentGalleryImages.length === 0) return;
        galleryImage.src = currentGalleryImages[index];
    }

    function showNextImage() {
        currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryImages.length;
        showGalleryImage(currentGalleryIndex);
    }

    function showPrevImage() {
        currentGalleryIndex = (currentGalleryIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
        showGalleryImage(currentGalleryIndex);
    }

    function openModal(images) {
        currentGalleryImages = images;
        currentGalleryIndex = 0;
        showGalleryImage(currentGalleryIndex);
        galleryModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Previene el scroll del fondo
        window.location.hash = 'gallery'; // Añade el hash para el historial del navegador
    }

    function closeModal(navigateBack = true) {
        galleryModal.classList.add('hidden');
        document.body.style.overflow = ''; // Restaura el scroll
        if (navigateBack && window.location.hash === '#gallery') {
            history.back(); // Vuelve atrás en el historial para quitar el hash '#gallery'
        }
    }

    // Listeners para los botones de la galería y el teclado
    prevImageButton.addEventListener('click', showPrevImage);
    nextImageButton.addEventListener('click', showNextImage);

    window.addEventListener('keydown', (e) => {
        if (galleryModal.classList.contains('hidden')) return; // No hacer nada si el modal está oculto

        if (e.key === 'ArrowRight') {
            showNextImage();
        } else if (e.key === 'ArrowLeft') {
            showPrevImage();
        } else if (e.key === 'Escape' && !galleryModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // --- NUEVA LÓGICA DE BÚSQUEDA ---

    async function performSearch(term) {
        loadingOverlay.classList.remove('hidden');
        await showPage('buscar');

        try {
            const fetchPromises = ACTIVE_CATEGORIES.map(category => 
                fetch(`data/${category}.json`).then(res => res.json())
            );
            
            const allServicesData = await Promise.all(fetchPromises);
            let allResults = [];
            const lowerCaseTerm = term.toLowerCase();

            allServicesData.forEach((services, index) => {
                const category = ACTIVE_CATEGORIES[index];
                const filteredServices = services.filter(service => 
                    service.title.toLowerCase().includes(lowerCaseTerm) ||
                    service.description.toLowerCase().includes(lowerCaseTerm)
                );

                // Añadir la categoría a cada resultado para construir el ID único
                const resultsWithCategory = filteredServices.map(service => ({ ...service, category }));
                allResults = allResults.concat(resultsWithCategory);
            });

            renderSearchResults(allResults, term);

        } catch (error) {
            console.error("Error durante la búsqueda:", error);
            searchResultsContainer.innerHTML = `<p class="text-red-500 col-span-full">Ocurrió un error al realizar la búsqueda.</p>`;
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    function renderSearchResults(results, term) {
        searchResultsHeader.innerHTML = `<h2 class="text-4xl font-extrabold text-gray-900">Resultados para: <span class="primary-color">${term}</span></h2>`;

        if (results.length === 0) {
            searchResultsContainer.innerHTML = `<p class="text-xl text-gray-500 col-span-full">No se encontraron diseños que coincidan con tu búsqueda.</p>`;
            return;
        }

        let html = '';
        results.forEach(service => {
            // Reutilizamos la misma lógica de renderizado de tarjetas
            const hasImages = service.images && service.images.length > 0;
            html += `
                <div class="catalog-card bg-gray-50 rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                    <div class="w-full h-48 bg-gray-300" style="background-image: url('${hasImages ? service.images[0] : 'https://via.placeholder.com/400x300.png/f3f4f6/cbd5e1?text=BL-studio'}'); background-size: cover; background-position: center;"></div>
                    <div class="p-5 flex-grow flex flex-col">
                        <h4 class="text-2xl font-semibold primary-color mb-2">${service.title}</h4>
                        <p class="text-gray-600 text-sm mb-4 flex-grow">${service.description}</p>
                        ${service.price ? `<div class="mb-4 text-center"><p class="text-2xl font-bold text-gray-800">${service.price}</p></div>` : ''}
                        <div class="mt-auto grid grid-cols-2 gap-2">
                            <button class="save-design-button w-full text-sm font-medium py-2.5 rounded-lg transition primary-bg text-white primary-hover" data-id="${service.category}-${service.id}" data-title="${service.title}" data-price="${service.price}">Guardar Diseño</button>
                            <button class="gallery-button w-full text-sm font-medium py-2.5 rounded-lg transition ${hasImages ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}" ${hasImages ? `data-images="${service.images.join(',')}"` : 'disabled'}>Ver Fotos</button>
                        </div>
                    </div>
                </div>
            `;
        });
        searchResultsContainer.innerHTML = html;
    }

    // --- 5. RENDERIZAR DISEÑOS GUARDADOS ---
    function renderSavedDesigns() {
        if (!savedDesignsContainer) return;

        const savedDesigns = JSON.parse(localStorage.getItem('savedDesigns')) || [];

        if (savedDesigns.length === 0) {
            savedDesignsContainer.innerHTML = `
                <h3 class="text-xl font-semibold mb-3">Diseños Seleccionados</h3>
                <p class="text-gray-500">Aún no has guardado ningún diseño. ¡Explora nuestros catálogos!</p>
            `;
            return;
        }

        let html = `
            <h3 class="text-xl font-semibold mb-3">Tus Diseños Seleccionados</h3>
            <div id="saved-list">
        `;
        savedDesigns.forEach(design => {
            html += `
                <div class="saved-design-item">
                    <div>
                        <span class="font-semibold">${design.title}</span>
                        <span class="text-gray-500 text-sm ml-2">${design.price}</span>
                    </div>
                    <button class="remove-design-button" data-id="${design.id}" title="Eliminar diseño">X</button>
                </div>
            `;
        });
        html += '</div>';
        savedDesignsContainer.innerHTML = html;
    }

    // --- 6. LÓGICA PARA ELIMINAR DISEÑOS GUARDADOS ---
    if (savedDesignsContainer) {
        savedDesignsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-design-button')) {
                const designId = e.target.dataset.id;
                let savedDesigns = JSON.parse(localStorage.getItem('savedDesigns')) || [];
                savedDesigns = savedDesigns.filter(d => d.id !== designId);
                localStorage.setItem('savedDesigns', JSON.stringify(savedDesigns));
                renderSavedDesigns(); // Volver a renderizar la lista actualizada
            }
        });
    }

    // --- 7. ESCUCHAR CAMBIOS EN EL HASH ---
    window.addEventListener('hashchange', handleRouteChange);

    // Cerrar dropdown si se hace clic fuera
    window.addEventListener('click', () => {
        if (designsDropdownMenu && !designsDropdownMenu.classList.contains('hidden')) {
            designsDropdownMenu.classList.add('hidden');
        }
    });

    // --- 7. RENDERIZADO DE MENÚS DINÁMICOS ---
    function renderCategoryMenus() {
        let desktopMenuHTML = '';
        let mobileMenuHTML = '';

        ACTIVE_CATEGORIES.forEach(key => {
            const category = CATEGORIES_CONFIG[key];
            const pageId = `sub_${key}`;
            desktopMenuHTML += `<a href="#" data-page-id="${pageId}" class="nav-link block px-4 py-3 text-sm text-gray-700 hover:bg-accent hover:text-gray-800 rounded-lg m-1 transition duration-150"><b>${category.name}</b></a>`;
            mobileMenuHTML += `<a href="#" data-page-id="${pageId}" class="nav-link-mobile block px-6 py-1 text-base text-gray-600 hover:bg-accent hover:text-gray-800 rounded-md transition duration-150"><b>${category.name}</b></a>`;
        });

        designsDropdownMenu.innerHTML = desktopMenuHTML;
        mobileDesignsMenu.innerHTML = mobileMenuHTML;
    }

    // --- 8. INICIALIZACIÓN DEL SITIO ---
    function initializeSite() {
        renderCategoryMenus();

        // Rellenar datos de contacto dinámicamente
        const whatsappDisplay = document.getElementById('whatsapp-number-display');
        if (whatsappDisplay) whatsappDisplay.textContent = `WhatsApp: ${CONTACT_INFO.whatsappDisplay}`;

        const contactWhatsapp = document.getElementById('contact-whatsapp');
        if (contactWhatsapp) contactWhatsapp.innerHTML = `WhatsApp: <a href="https://wa.me/${CONTACT_INFO.whatsappNumber}" target="_blank" class="primary-color hover:underline font-medium">${CONTACT_INFO.whatsappDisplay}</a>`;

        const contactEmail = document.getElementById('contact-email');
        if (contactEmail) contactEmail.innerHTML = `Email: <a href="mailto:${CONTACT_INFO.email}" class="primary-color hover:underline font-medium">${CONTACT_INFO.email}</a>`;

        // Manejar la ruta inicial al cargar la página (basado en el hash o por defecto 'inicio')
        handleRouteChange();
    }

    initializeSite();
});
