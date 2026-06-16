const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = 3000;

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error("ERRORE CRITICO: La variabile d'ambiente MONGO_URI non è definita!");
    process.exit(1);
}

let dbClient;
let todoCollection;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// connessione db
async function connectWithRetry() {
    console.log(`Tentativo di connessione a MongoDB su: ${mongoUri.replace(/:([^:@\s]+)@/, ':****@')}`); // Maschera la password nei log!
    try {
        dbClient = await MongoClient.connect(mongoUri, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 
        });
        const db = dbClient.db('wizdb');
        todoCollection = db.collection('todos');
        console.log("Connessione a MongoDB completata con successo!");
    } catch (err) {
        console.error("Connessione a MongoDB fallita. Nuovo tentativo tra 5 secondi...", err.message);
        setTimeout(connectWithRetry, 5000);
    }
}

connectWithRetry();

// --- API ROUTES ---

// 1. GET: Recupera tutti i Todo
app.get('/', async (req, res) => {
    try {
        if (!todoCollection) {
            return res.status(503).send("Database non ancora pronto...");
        }
        const todos = await todoCollection.find({}).toArray();
        
        // simple html interface
        let html = `
            <html>
            <head>
                <title>Wiz Secure Pipeline</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f6f9; color: #333; }
                    .container { max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    h1 { color: #1e293b; text-align: center; }
                    ul { list-style: none; padding: 0; }
                    li { background: #f8fafc; padding: 12px; margin-bottom: 8px; border-left: 5px solid #3b82f6; border-radius: 4px; display: flex; justify-content: space-between; }
                    form { display: flex; margin-top: 20px; }
                    input[type="text"] { flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; margin-right: 10px; }
                    button { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
                    button:hover { background: #2563eb; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Wiz Todo App Live Demo</h1>
                    <ul>
                        ${todos.map(t => `<li><span>${t.task}</span> <small style="color:#94a3b8;">${t.createdAt || ''}</small></li>`).join('')}
                    </ul>
                    <form action="/add" method="POST">
                        <input type="text" name="task" placeholder="Inserisci un nuovo task..." required />
                        <button type="submit">Aggiungi</button>
                    </form>
                </div>
            </body>
            </html>
        `;
        res.send(html);
    } catch (err) {
        res.status(500).send("Errore durante il recupero dei dati: " + err.message);
    }
});

// 2. POST: Aggiungi un nuovo Todo
app.post('/add', async (req, res) => {
    try {
        const newTask = req.body.task;
        if (newTask && todoCollection) {
            await todoCollection.insertOne({ 
                task: newTask, 
                createdAt: new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' }) 
            });
        }
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Errore durante l'inserimento: " + err.message);
    }
});

// Health check endpoint - per ALB
app.get('/health', (req, res) => {
    if (todoCollection) {
        res.status(200).json({ status: "UP", database: "CONNECTED" });
    } else {
        res.status(500).json({ status: "DOWN", database: "DISCONNECTED" });
    }
});

app.listen(port, () => {
    console.log(`Applicazione in ascolto sulla porta ${port}`);
});
