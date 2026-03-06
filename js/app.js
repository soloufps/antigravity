document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar contador de productos
    updateCartBadge();

    // Lógica dinámica para el menú administrativo (Solo Admins)
    try {
        const isAdmin = await Auth.isAdmin();
        if (isAdmin) {
            const navContainer = document.querySelector('header nav') ||
                document.querySelector('.hidden.md\\:flex.items-center.gap-6') ||
                document.querySelector('.flex.items-center.gap-9') ||
                document.querySelector('.flex.flex-1.justify-end.gap-8 nav');

            console.log('[DEBUG UI] Nav container found:', !!navContainer);

            if (navContainer) {
                // Evitar duplicados
                if (!document.getElementById('sale-link')) {
                    const saleLink = document.createElement('a');
                    saleLink.id = 'sale-link';
                    saleLink.className = 'text-sm font-medium text-rose-500 hover:text-rose-600 cursor-pointer transition-colors';
                    const isVentasPage = window.location.pathname.includes('mis_ventas.html') ||
                        window.location.pathname.includes('add_new_product_management.html');
                    saleLink.textContent = isVentasPage ? 'Añadir Productos' : 'Vender';
                    saleLink.href = 'add_new_product_management.html';
                    navContainer.appendChild(saleLink);
                    console.log('[DEBUG UI] Injected admin link:', saleLink.textContent);
                }
            }

            // Ocultar carrito para admin
            const cartBtn = document.querySelector('a[href="carrito.html"]') ||
                document.querySelector('button .material-symbols-outlined:contains("shopping_cart")')?.parentElement ||
                document.querySelector('button:has(.material-symbols-outlined)'); // Fallback selector

            // Búsqueda más robusta del botón del carrito
            const allButtons = document.querySelectorAll('button, a');
            allButtons.forEach(btn => {
                if (btn.href?.includes('carrito.html') || btn.querySelector('.material-symbols-outlined')?.textContent.trim() === 'shopping_cart' || btn.querySelector('.material-symbols-outlined')?.textContent.trim() === 'shopping_bag') {
                    btn.style.display = 'none';
                    console.log('[DEBUG UI] Hidden cart for admin');
                }
            });
        }
    } catch (e) {
        console.error('Error in admin check at startup:', e);
    }

    // Asegurar que el link de Mis ventas funcione en todas las páginas
    const misVentasLinks = document.querySelectorAll('a[href="mis_ventas.html"]');
    misVentasLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Podríamos añadir un guard aquí también si fuera necesario
        });
    });

    // Lógica para la página principal (index.html)
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        let allProducts = await API.getProducts();
        let filteredProducts = [...allProducts];

        // Paginación
        let currentPage = 1;
        const productsPerPage = 6;

        let activeFilters = {
            search: '',
            category: 'all',
            minPrice: 0,
            maxPrice: 2500,
            priceModified: false // Indica si el usuario ha interactuado con el filtro de precio
        };

        // Ajustar el máximo del rango según el producto más caro
        const maxProductPrice = allProducts.reduce((max, p) => Math.max(max, p.price), 0);
        const priceRange = document.getElementById('price-range');
        if (priceRange) {
            priceRange.max = Math.ceil(maxProductPrice);
            priceRange.value = priceRange.max;
            activeFilters.maxPrice = priceRange.max;
            const maxInput = document.getElementById('max-price');
            if (maxInput) maxInput.value = activeFilters.maxPrice;
            const priceValue = document.getElementById('price-value');
            if (priceValue) priceValue.textContent = `$${activeFilters.maxPrice.toLocaleString()}`;
        }

        const renderPagination = (totalItems) => {
            const paginationContainer = document.getElementById('pagination-container');
            if (!paginationContainer) return;

            const totalPages = Math.ceil(totalItems / productsPerPage);
            paginationContainer.innerHTML = '';

            if (totalPages <= 1) return;

            // Botón Anterior
            const prevBtn = document.createElement('button');
            prevBtn.className = `p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : ''}`;
            prevBtn.disabled = currentPage === 1;
            prevBtn.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
            prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; applyFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
            paginationContainer.appendChild(prevBtn);

            // Números de Página
            for (let i = 1; i <= totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `size-9 rounded-lg text-sm font-bold transition-colors ${currentPage === i ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`;
                pageBtn.textContent = i;
                pageBtn.onclick = () => { currentPage = i; applyFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
                paginationContainer.appendChild(pageBtn);
            }

            // Botón Siguiente
            const nextBtn = document.createElement('button');
            nextBtn.className = `p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : ''}`;
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
            nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; applyFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
            paginationContainer.appendChild(nextBtn);
        };

        const applyFilters = () => {
            filteredProducts = allProducts.filter(p => {
                const searchLower = activeFilters.search.toLowerCase();
                const matchesSearch = p.name.toLowerCase().includes(searchLower) ||
                    p.category.toLowerCase().includes(searchLower);

                const matchesCategory = activeFilters.category === 'all' ||
                    p.category.trim().toLowerCase() === activeFilters.category.trim().toLowerCase();

                // Solo aplicar filtro de precio si ha sido modificado
                let matchesPrice = true;
                if (activeFilters.priceModified) {
                    matchesPrice = p.price >= activeFilters.minPrice && p.price <= activeFilters.maxPrice;
                }

                return matchesSearch && matchesCategory && matchesPrice;
            });

            // Actualizar contadores
            const showingCount = document.getElementById('showing-count');
            const totalCount = document.getElementById('total-count');
            if (totalCount) totalCount.textContent = filteredProducts.length;

            const startIndex = (currentPage - 1) * productsPerPage;
            const endIndex = startIndex + productsPerPage;
            const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

            if (showingCount) showingCount.textContent = paginatedProducts.length;

            renderProducts(paginatedProducts, productGrid);
            renderPagination(filteredProducts.length);
        };

        // 1. Categorías Dinámicas
        const categoriesContainer = document.getElementById('categories-container');
        if (categoriesContainer) {
            const categories = await API.getCategories();
            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'category-btn w-full flex items-center justify-start text-left gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors';
                btn.dataset.category = cat.descripcion;
                btn.innerHTML = `<span class="text-sm">${cat.descripcion}</span>`;
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.category-btn').forEach(b => {
                        b.classList.remove('bg-primary/10', 'text-primary', 'font-medium');
                        b.classList.add('hover:bg-slate-100', 'dark:hover:bg-slate-800');
                    });
                    btn.classList.add('bg-primary/10', 'text-primary', 'font-medium');
                    btn.classList.remove('hover:bg-slate-100', 'dark:hover:bg-slate-800');

                    activeFilters.category = cat.descripcion;
                    currentPage = 1;
                    applyFilters();
                });
                categoriesContainer.appendChild(btn);
            });

            const allBtn = categoriesContainer.querySelector('[data-category="all"]');
            if (allBtn) {
                allBtn.addEventListener('click', () => {
                    document.querySelectorAll('.category-btn').forEach(b => {
                        b.classList.remove('bg-primary/10', 'text-primary', 'font-medium');
                        b.classList.add('hover:bg-slate-100', 'dark:hover:bg-slate-800');
                    });
                    allBtn.classList.add('bg-primary/10', 'text-primary', 'font-medium');
                    activeFilters.category = 'all';
                    currentPage = 1;
                    applyFilters();
                });
            }
        }

        // 2. Búsqueda
        const searchInput = document.querySelector('input[placeholder*="Buscar"]');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                activeFilters.search = e.target.value.toLowerCase();
                currentPage = 1;
                applyFilters();
            });
        }

        // 3. Rango de Precios
        const minInput = document.getElementById('min-price');
        const maxInput = document.getElementById('max-price');
        const priceValue = document.getElementById('price-value');
        const priceFilterContainer = document.getElementById('price-filter-container');

        const activatePriceFilter = () => {
            if (!activeFilters.priceModified) {
                activeFilters.priceModified = true;
                if (priceFilterContainer) priceFilterContainer.classList.remove('opacity-50');
            }
        };

        if (priceRange && minInput && maxInput) {
            priceRange.addEventListener('input', (e) => {
                activatePriceFilter();
                activeFilters.maxPrice = parseInt(e.target.value);
                maxInput.value = activeFilters.maxPrice;
                if (priceValue) priceValue.textContent = `$${activeFilters.maxPrice.toLocaleString()}`;
                currentPage = 1;
                applyFilters();
            });

            minInput.addEventListener('change', (e) => {
                activatePriceFilter();
                activeFilters.minPrice = Math.max(0, parseInt(e.target.value) || 0);
                e.target.value = activeFilters.minPrice;
                currentPage = 1;
                applyFilters();
            });

            maxInput.addEventListener('change', (e) => {
                activatePriceFilter();
                activeFilters.maxPrice = parseInt(e.target.value) || 2500;
                e.target.value = activeFilters.maxPrice;
                // Ajustar el max del slider si es necesario
                if (activeFilters.maxPrice > priceRange.max) {
                    priceRange.max = activeFilters.maxPrice;
                }
                priceRange.value = activeFilters.maxPrice;
                if (priceValue) priceValue.textContent = `$${activeFilters.maxPrice.toLocaleString()}`;
                currentPage = 1;
                applyFilters();
            });
        }

        // 4. Reset Filters
        const resetBtn = document.getElementById('reset-filters-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                activeFilters = {
                    search: '',
                    category: 'all',
                    minPrice: 0,
                    maxPrice: Math.ceil(maxProductPrice),
                    priceModified: false
                };
                if (searchInput) searchInput.value = '';

                // Reset UI
                document.querySelectorAll('.category-btn').forEach(b => {
                    b.classList.remove('bg-primary/10', 'text-primary', 'font-medium');
                    b.classList.add('hover:bg-slate-100', 'dark:hover:bg-slate-800');
                });
                const allBtn = document.querySelector('[data-category="all"]');
                if (allBtn) allBtn.classList.add('bg-primary/10', 'text-primary', 'font-medium');

                if (minInput) minInput.value = 0;
                if (maxInput) maxInput.value = activeFilters.maxPrice;
                if (priceRange) {
                    priceRange.max = activeFilters.maxPrice;
                    priceRange.value = activeFilters.maxPrice;
                }
                if (priceValue) priceValue.textContent = `$${activeFilters.maxPrice.toLocaleString()}`;
                if (priceFilterContainer) priceFilterContainer.classList.add('opacity-50');

                currentPage = 1;
                applyFilters();
            });
        }

        // Render inicial
        applyFilters();
    }

    // Cargar productos recomendados en carrito.html
    const recommendedGrid = document.getElementById('recommended-grid');
    if (recommendedGrid) {
        const products = await API.getProducts();
        renderProducts(products.slice(0, 4), recommendedGrid);
    }

    // Cargar UI del carrito
    const cartItems = document.getElementById('cart-items');
    if (cartItems) {
        Carrito.renderCartUI();
    }

    // UI de Auth y Menu de Usuario - OPTIMIZADO
    const initAuthUI = async () => {
        const authSection = document.getElementById('auth-section');
        if (!authSection) return;

        const menuBtn = document.getElementById('user-menu-btn');
        const dropdown = document.getElementById('user-dropdown');
        const loginText = document.getElementById('login-text');

        // Mostrar estado de carga inicial si no hay sesión instantánea
        if (menuBtn) {
            menuBtn.classList.add('animate-pulse', 'opacity-50');
        }

        try {
            // Ejecutar obtención de usuario e isAdmin en paralelo
            const [user, isAdmin] = await Promise.all([Auth.getUser(), Auth.isAdmin()]);

            if (menuBtn) menuBtn.classList.remove('animate-pulse', 'opacity-50');
            console.log('[DEBUG AUTH] User detected:', user, 'Is Admin:', isAdmin);

            if (user) {
                const userName = user.user_metadata?.full_name || user.email.split('@')[0];

                if (loginText) loginText.classList.add('hidden');

                if (menuBtn) {
                    // Desactivar el enlace estático
                    menuBtn.href = 'javascript:void(0)';
                    // Limpiar listeners previos para evitar duplicados
                    const newMenuBtn = menuBtn.cloneNode(true);
                    menuBtn.parentNode.replaceChild(newMenuBtn, menuBtn);

                    newMenuBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dropdown) dropdown.classList.toggle('active');
                    });

                    // Actualizar el contenido para usuario logueado
                    newMenuBtn.innerHTML = `
                        <div class="flex flex-col items-end hidden sm:flex mr-1 font-display">
                            <span class="text-xs font-bold text-slate-900 dark:text-white">${userName}</span>
                            <span class="text-[10px] text-slate-400 font-medium">${isAdmin ? 'Administrador' : 'Cliente'}</span>
                        </div>
                        <div class="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                            <img class="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=${userName}&background=135bec&color=fff" />
                        </div>
                    `;

                    // Cerrar al hacer click fuera
                    document.addEventListener('click', () => {
                        if (dropdown) dropdown.classList.remove('active');
                    });

                    if (dropdown) {
                        dropdown.addEventListener('click', (e) => {
                            e.stopPropagation();
                        });

                        // MODIFICACIÓN: Filtrar enlaces del dropdown por rol
                        dropdown.innerHTML = `
                            <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                                <p class="text-sm font-bold text-slate-900 dark:text-white">${userName}</p>
                                <p class="text-xs text-slate-500 dark:text-slate-400 truncate">${user.email}</p>
                            </div>
                            <a href="perfil.html"
                                class="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <span class="material-symbols-outlined text-lg">account_circle</span>
                                Mi perfil
                            </a>
                            ${isAdmin ? `
                            <a href="mis_ventas.html"
                                class="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <span class="material-symbols-outlined text-lg">receipt_long</span>
                                Mis ventas
                            </a>
                            ` : ''}
                            <div class="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                            <button onclick="Auth.logout()"
                                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left font-medium">
                                <span class="material-symbols-outlined text-lg">logout</span>
                                Cerrar sesión
                            </button>
                        `;
                    }
                }
            } else if (menuBtn) {
                if (dropdown) dropdown.classList.remove('active');
                if (loginText) loginText.classList.remove('hidden');
            }
        } catch (error) {
            console.error('[AUTH UI ERROR]', error);
            if (loginText) loginText.classList.remove('hidden');
        }
    };

    // Ejecutar validación de auth de forma preferente
    initAuthUI();
});

function updateCartBadge() {
    const items = Carrito.getItems();
    const count = items.reduce((acc, item) => acc + item.quantity, 0);
    const badge = document.getElementById('cart-count') || document.getElementById('cart-dot');
    if (badge) {
        if (count > 0) {
            badge.classList.remove('hidden');
            badge.textContent = count;
        } else {
            badge.classList.add('hidden');
            badge.textContent = '0';
        }
    }
}

function renderProducts(products, container) {
    if (products.length === 0) {
        container.innerHTML = '<div class="col-span-full flex flex-col items-center justify-center py-20 text-slate-500"><span class="material-symbols-outlined text-6xl mb-4">search_off</span><p class="text-lg">No se encontraron productos.</p></div>';
        return;
    }
    container.innerHTML = products.map(product => {
        const productJSON = JSON.stringify(product).replace(/"/g, '&quot;');

        // Priorizar imagen_url (remoto), luego image (fallback), luego placeholder
        const imgSrc = product.imagen_url || product.image || 'assets/imagenes/placeholder.png';

        return `
            <div class="group relative flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                <div class="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                         src="${imgSrc}" 
                         alt="${product.name}"
                         onerror="this.src='https://via.placeholder.com/300x250?text=Error+de+Carga'">
                </div>
                <div class="p-5 flex flex-col flex-1">
                    <div class="mb-2">
                        <p class="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 opacity-70">${product.category}</p>
                        <h3 class="font-bold text-slate-900 dark:text-slate-100 leading-tight text-base">${product.name}</h3>
                    </div>

                    <!-- Descripción que se despliega hacia abajo sin tapar la imagen -->
                    <div class="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 ease-in-out">
                        <div class="overflow-hidden">
                            <p class="text-xs text-slate-500 dark:text-slate-400 py-3 border-t border-slate-100 dark:border-slate-800 mt-2 line-clamp-4 leading-relaxed">
                                ${product.description || 'Sin descripción disponible.'}
                            </p>
                        </div>
                    </div>

                    <div class="mt-auto flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
                        <div class="flex flex-col">
                            <span class="text-xs text-slate-400 font-medium">Precio</span>
                            <span class="text-lg font-black text-slate-900 dark:text-white">$${product.price.toLocaleString()}</span>
                        </div>
                        <button class="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 active:scale-95" 
                                onclick="Carrito.add(${productJSON});">
                            <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
                            Añadir
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Sistema de Notificaciones "Bien Bonito"
window.showToast = (title, message, type = 'success') => {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    const icon = type === 'success' ? 'check_circle' : 'error';
    const bgColor = type === 'success' ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500';

    toast.className = `bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-2xl flex items-center gap-4 transition-all duration-500 translate-y-10 opacity-0 pointer-events-auto`;

    toast.innerHTML = `
        <div class="${bgColor} p-2.5 rounded-lg flex items-center justify-center">
            <span class="material-symbols-outlined text-xl">${icon}</span>
        </div>
        <div class="flex-1">
            <p class="font-bold text-slate-900 dark:text-white text-sm">${title}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${message}</p>
        </div>
        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onclick="this.parentElement.remove()">
            <span class="material-symbols-outlined text-lg">close</span>
        </button>
    `;

    container.appendChild(toast);

    // Animación de entrada
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);

    // Auto-eliminar después de 4 segundos
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-10');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
};

// Mostrar campo de email si es invitado en carrito.html
document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('carrito.html')) {
        const guestEmailContainer = document.getElementById('guest-email-container');
        if (guestEmailContainer) {
            const user = await Auth.getUser();
            if (!user) {
                guestEmailContainer.classList.remove('hidden');
                console.log('[DEBUG CARRITO] Modo Invitado Activo');
            }
        }
    }
});
