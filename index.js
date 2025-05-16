console.clear();
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da página de login
    const loginPage = document.getElementById('loginPage');
    const searchPage = document.getElementById('searchPage');
    const form = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const btnText = document.getElementById('btnText');
    const spinnerText = document.getElementById('spinnerText');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const identityInput = document.getElementById('identity');

    // Elementos da página de busca
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const booksGrid = document.getElementById('booksGrid');

    // Elementos do menu do livro
    const overlay = document.getElementById('overlay');
    const bookMenu = document.getElementById('bookMenu');
    const closeMenu = document.getElementById('closeMenu');
    const menuBookImage = document.getElementById('menuBookImage');
    const menuBookTitle = document.getElementById('menuBookTitle');
    const menuBookAuthor = document.getElementById('menuBookAuthor');
    const menuBookDetails = document.getElementById('menuBookDetails');
    const logoutButton = document.getElementById('logoutButton');
    const logoCircle = document.getElementById('logoCircle');
    const logoutBox = document.getElementById('logoutBox');

    // Elementos do menu do logo
    const logoMenu = document.getElementById('logoMenu');
    const logoutOption = document.getElementById('logoutOption');

    // Verificar se já está logado
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const authToken = localStorage.getItem('authToken');
    
    if (isLoggedIn && authToken) {
        loginPage.style.display = 'none';
        searchPage.style.display = 'block';
        searchBooks();
    } else {
        loginPage.style.display = 'block';
        searchPage.style.display = 'none';
        // Limpar qualquer token antigo inválido
        localStorage.removeItem('authToken');
        localStorage.removeItem('isLoggedIn');
    }

    // Função para mostrar notificações
    function showNotification(message, type = 'error') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }

    // Função para enviar resposta
    async function sendAnswer(bookSlug) {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showNotification('Token de autenticação não encontrado');
            return;
        }

        const answerButton = document.querySelector('.book-menu-button.primary');
        const progressElement = document.getElementById('answerProgress');
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        const progressStats = document.getElementById('progressStats');

        if (answerButton) {
            answerButton.classList.add('loading');
        }

        if (progressElement) {
            progressElement.classList.add('show');
        }

        let attempts = 0;
        const maxAttempts = 3;

        async function trySendAnswer() {
            try {
                attempts++;
                progressText.textContent = `Tentativa ${attempts} de ${maxAttempts}...`;

                // Primeira etapa: obter o ID da resposta
                const response = await fetch('https://applied-activity-answer.vercel.app/api/answer', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                        'Accept': 'application/json',
                        'Origin': 'https://livros.arvore.com.br',
                        'Referer': 'https://livros.arvore.com.br/'
                    },
                    body: JSON.stringify({
                        authToken: authToken,
                        bookSlug: bookSlug
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    if (errorData.error === "Atividade não encontrada para este livro") {
                        throw new Error("Este livro não possui atividades disponíveis");
                    }
                    throw new Error('Erro ao obter ID da resposta');
                }

                const answerData = await response.json();
                console.log('ID da resposta obtido:', answerData);

                if (!answerData.answerId) {
                    throw new Error('ID da resposta não encontrado na resposta');
                }

                // Segunda etapa: enviar a resposta final
                const finalResponse = await fetch('https://respostas-api.vercel.app/submit-answers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        bookSlug: bookSlug,
                        authToken: authToken,
                        appliedActivityAnswerId: answerData.answerId
                    })
                });

                if (!finalResponse.ok) {
                    const errorData = await finalResponse.json();
                    if (errorData.error === "Atividade não encontrada para este livro") {
                        throw new Error("Este livro não possui atividades disponíveis");
                    }
                    throw new Error(errorData.error || 'Erro ao enviar resposta final');
                }

                const finalData = await finalResponse.json();
                console.log('Resposta enviada com sucesso:', finalData);

                // Verificar se todas as respostas foram enviadas corretamente
                if (finalData.totalQuestions && finalData.correctAnswersFound) {
                    const progress = (finalData.correctAnswersFound / finalData.totalQuestions) * 100;
                    progressBar.style.width = `${progress}%`;
                    progressStats.textContent = `${finalData.correctAnswersFound}/${finalData.totalQuestions} respostas corretas`;

                    if (finalData.correctAnswersFound < finalData.totalQuestions) {
                        if (attempts < maxAttempts) {
                            progressText.textContent = `Tentando novamente... (${attempts}/${maxAttempts})`;
                            await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2 segundos antes de tentar novamente
                            return trySendAnswer();
                        } else {
                            throw new Error(`Não foi possível enviar todas as respostas corretamente após ${maxAttempts} tentativas`);
                        }
                    }
                }

                // Mostrar mensagem de sucesso
                showNotification('Resposta enviada com sucesso!', 'success');
                
                // Fechar o menu do livro após enviar a resposta
                const overlay = document.getElementById('overlay');
                const bookMenu = document.getElementById('bookMenu');
                if (overlay && bookMenu) {
                    overlay.style.display = 'none';
                    bookMenu.style.display = 'none';
                }
            } catch (error) {
                console.error('Erro ao enviar resposta:', error);
                showNotification(error.message, 'error');
            } finally {
                if (answerButton) {
                    answerButton.classList.remove('loading');
                }
                if (progressElement) {
                    progressElement.classList.remove('show');
                }
            }
        }

        await trySendAnswer();
    }

    // Função para exibir o menu do livro
    function showBookMenu(book) {
        const overlay = document.getElementById('overlay');
        const bookMenu = document.getElementById('bookMenu');
        const bookLoading = document.getElementById('bookLoading');
        const menuBookImage = document.getElementById('menuBookImage');
        const menuBookTitle = document.getElementById('menuBookTitle');
        const menuBookAuthor = document.getElementById('menuBookAuthor');
        const menuBookDetails = document.getElementById('menuBookDetails');
        const answerButton = document.querySelector('.book-menu-button.primary');

        if (overlay && bookMenu && menuBookImage && menuBookTitle && menuBookAuthor && menuBookDetails && answerButton && bookLoading) {
            // Mostrar overlay e loading
            overlay.style.display = 'block';
            bookLoading.classList.add('show');

            // Carregar imagem primeiro
            const img = new Image();
            img.onload = function() {
                // Quando a imagem carregar, mostrar o menu e esconder o loading
                menuBookImage.src = book.imageUrlThumb || book.imageUrlThumbLow || 'https://via.placeholder.com/183x268?text=Sem+imagem';
                menuBookTitle.textContent = book.name;
                menuBookAuthor.textContent = book.author;
                
                let details = '';
                if (book.publisher?.name) details += `<p>Editora: ${book.publisher.name}</p>`;
                if (book.language) details += `<p>Idioma: ${book.language}</p>`;
                if (book.hasAudioBook) details += '<p>Disponível em áudio</p>';
                if (book.hasEbook) details += '<p>Disponível em e-book</p>';
                
                menuBookDetails.innerHTML = details;
                
                // Adicionar evento de clique no botão Responder Agora
                answerButton.onclick = () => sendAnswer(book.slug);
                
                // Esconder loading e mostrar menu
                bookLoading.classList.remove('show');
                bookMenu.style.display = 'block';
            };
            
            img.onerror = function() {
                // Se houver erro ao carregar a imagem, usar placeholder
                menuBookImage.src = 'https://via.placeholder.com/183x268?text=Sem+imagem';
                menuBookTitle.textContent = book.name;
                menuBookAuthor.textContent = book.author;
                
                let details = '';
                if (book.publisher?.name) details += `<p>Editora: ${book.publisher.name}</p>`;
                if (book.language) details += `<p>Idioma: ${book.language}</p>`;
                if (book.hasAudioBook) details += '<p>Disponível em áudio</p>';
                if (book.hasEbook) details += '<p>Disponível em e-book</p>';
                
                menuBookDetails.innerHTML = details;
                
                // Adicionar evento de clique no botão Responder Agora
                answerButton.onclick = () => sendAnswer(book.slug);
                
                // Esconder loading e mostrar menu
                bookLoading.classList.remove('show');
                bookMenu.style.display = 'block';
            };
            
            // Iniciar carregamento da imagem
            img.src = book.imageUrlThumb || book.imageUrlThumbLow || 'https://via.placeholder.com/183x268?text=Sem+imagem';
        }
    }

    // Função para buscar livros
    async function searchBooks(term = null) {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showNotification('Token de autenticação não encontrado');
            return;
        }

        try {
            console.log('Buscando livros com token:', authToken);
            
            const response = await fetch('https://livros.arvore.com.br/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                    'Authorization': `Bearer ${authToken}`,
                    'Accept-Language': 'pt-BR,pt;q=0.5'
                },
                body: JSON.stringify({
                    operationName: "searchBookV3",
                    variables: {
                        searchTerm: term,
                        page: 1,
                        opts: "{}",
                        perPage: 50
                    },
                    query: `query searchBookV3($searchTerm: String, $page: Int, $perPage: Int!, $opts: String) {
                        searchBookV3(
                            searchTerm: $searchTerm
                            page: $page
                            perPage: $perPage
                            opts: $opts
                        ) {
                            searchFilters
                            books {
                                name
                                slug
                                author
                                degree
                                hasAudioBook
                                hasEbook
                                language
                                imageUrlThumb
                                imageUrlThumbLow
                                publisher {
                                    id
                                    name
                                    __typename
                                }
                                __typename
                            }
                            __typename
                        }
                    }`
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao buscar livros');
            }

            const data = await response.json();
            console.log('Resposta da busca:', data);
            
            if (data.data?.searchBookV3?.books) {
                displayBooks(data.data.searchBookV3.books);
            } else {
                showNotification('Nenhum livro encontrado');
            }
        } catch (error) {
            console.error('Erro ao buscar livros:', error);
            showNotification(error.message);
        }
    }

    // Função para exibir os livros
    function displayBooks(books) {
        booksGrid.innerHTML = '';
        
        books.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'book-card';
            
            bookCard.innerHTML = `
                <img src="${book.imageUrlThumb || book.imageUrlThumbLow || 'https://via.placeholder.com/183x268?text=Sem+imagem'}" alt="${book.name}">
                <h3>${book.name}</h3>
                <p>${book.author}</p>
            `;
            
            bookCard.addEventListener('click', () => showBookMenu(book));
            booksGrid.appendChild(bookCard);
        });
    }

    // Função para buscar informações do usuário do Discord
    async function fetchDiscordUser() {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return null;

        try {
            const response = await fetch('https://discord.com/api/v10/users/@me', {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar informações do usuário');
            }

            const userData = await response.json();
            console.log('Dados do usuário:', userData);
            return userData;
        } catch (error) {
            console.error('Erro ao buscar usuário do Discord:', error);
            return null;
        }
    }

    // Função para atualizar a foto do usuário
    async function updateUserAvatar() {
        const userData = await fetchDiscordUser();
        if (userData) {
            let avatarUrl;
            if (userData.avatar) {
                avatarUrl = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`;
            } else {
                // Usar a foto local como avatar padrão
                avatarUrl = '/assets/foto.png';
            }
            
            // Atualizar todos os elementos logo-circle
            const logoCircles = document.querySelectorAll('.logo-circle');
            logoCircles.forEach(circle => {
                circle.style.backgroundImage = `url(${avatarUrl})`;
                circle.style.backgroundSize = 'cover';
                circle.style.backgroundPosition = 'center';
                circle.style.color = 'transparent'; // Esconder o texto ID
                circle.textContent = ''; // Remover o texto ID
            });
        }
    }

    // Função para lidar com o login
    async function handleLogin(identity) {
        try {
            console.log('Tentando fazer login com identity:', identity);
            
            const response = await fetch('https://api-login-lilac.vercel.app/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ identity })
            });

            if (!response.ok) {
                throw new Error('Erro ao fazer login');
            }

            const data = await response.json();
            console.log('Resposta do login:', data);
            
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('isLoggedIn', 'true');
                
                // Atualizar a foto do usuário após o login bem-sucedido
                await updateUserAvatar();
                
                loginPage.style.display = 'none';
                searchPage.style.display = 'block';
                searchBooks();
            } else {
                throw new Error('Token não recebido na resposta');
            }
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            showNotification(error.message);
        }
    }

    // Função para lidar com o logout
    function handleLogout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('isLoggedIn');
        loginPage.style.display = 'block';
        searchPage.style.display = 'none';
        showNotification('Você foi desconectado com sucesso', 'success');
    }

    // Event Listeners
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const identity = identityInput.value.trim();
        if (identity) {
            handleLogin(identity);
        } else {
            showNotification('Por favor, insira um identity válido');
        }
    });

    searchButton.addEventListener('click', () => {
        const term = searchInput.value.trim();
        searchBooks(term);
    });

    closeMenu.addEventListener('click', () => {
        overlay.style.display = 'none';
        bookMenu.style.display = 'none';
    });

    // Event listener para o logo-circle
    logoCircle.addEventListener('click', () => {
        logoutBox.classList.toggle('show');
    });

    // Fecha o logout-box quando clicar fora
    document.addEventListener('click', (e) => {
        if (!logoCircle.contains(e.target) && !logoutBox.contains(e.target)) {
            logoutBox.classList.remove('show');
        }
    });

    // Event listener para o botão de logout
    logoutBox.addEventListener('click', handleLogout);

    // Evento para o menu do logo
    logoCircle.addEventListener('click', () => {
        logoMenu.style.display = logoMenu.style.display === 'block' ? 'none' : 'block';
    });

    // Fechar o menu do logo quando clicar fora
    document.addEventListener('click', (e) => {
        if (!logoCircle.contains(e.target) && !logoMenu.contains(e.target)) {
            logoMenu.style.display = 'none';
        }
    });
}); 