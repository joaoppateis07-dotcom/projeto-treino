# 📁 Sistema RH Documentos

Sistema web para gestão de pastas de funcionários com autenticação e interface moderna.

## 🎯 **O que faz**
- Gerencia pastas digitais de funcionários (Nome, CPF, Cargo, Setor)
- Sistema de login com cookies
- Interface responsiva com cards e modais
- Persistência em SQLite

## 🚀 **Como usar**
```bash
npm install        # Instalar dependências
npm start         # Iniciar servidor (porta 3000)
```

**Login padrão:**
- Usuário: `Maria Pateis`
- Senha: `UpConsult@25`

## 📂 **Estrutura dos Arquivos**

### **Raiz**
- `package.json` - Dependências e scripts npm
- `server.js` - **Servidor Express** (rotas, auth, API, SQLite)

### **Frontend (`/public`)**
- `index.html` - **Página de login** (entrada do sistema)
- `html/app.html` - **App principal** (dashboard + modal)

### **Estilos (`/public/css`)**  
- `app.css` - **Estilos principais** (layout, modal, cards, botões)
- `style.css` - Estilos complementares

### **JavaScript (`/public/js`)**
- `app.js` - Script principal da aplicação
- `modules/modalNovaPasta.js` - **Lógica do modal** (criar/listar pastas)

## 🔧 **APIs Disponíveis**

| Método | Endpoint | Função |
|--------|----------|---------|
| `POST` | `/login` | Autenticar usuário |
| `GET` | `/logout` | Fazer logout |
| `POST` | `/pastas` | Criar nova pasta |
| `GET` | `/pastas` | Listar todas as pastas |

## 🗃️ **Banco de Dados**
**SQLite** (`db.sqlite`) - Tabela `pastas`:
- `id` - Chave primária
- `nome` - Nome do funcionário  
- `cpf` - CPF do funcionário
- `cargo` - Cargo selecionado
- `setor` - Setor selecionado

## 🔐 **Segurança**
- **Middleware de auth**: Protege rotas `/html/*`
- **Cookies httpOnly**: Sessão segura  
- **Prepared statements**: Previne SQL injection
- **Express.static**: Servir arquivos estáticos

## ⚡ **Funcionalidades**
- ✅ Login com redirecionamento automático
- ✅ Dashboard com cards de estatísticas  
- ✅ Modal para criar pastas
- ✅ Validação de campos obrigatórios
- ✅ Lista de pastas clicáveis (ver detalhes)
- ✅ Persistência no banco SQLite
- ✅ Interface responsiva

## 🎨 **Design**
- **Tema dark** com acentos dourados
- **Cards flutuantes** com hover effects
- **Modal centralizado** com backdrop blur
- **Grid responsivo** para pastas
- **Animações suaves** (transform, transitions)

---
*Sistema desenvolvido para gestão eficiente de documentos de RH* 🏢