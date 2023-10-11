from flask import Flask, render_template, request, redirect, url_for
import sqlite3

app = Flask(__name__)

# Criando um banco de dados SQLite
conn = sqlite3.connect('cadastro.db')
cursor = conn.cursor()

# Criando uma tabela no banco de dados
cursor.execute('''
    CREATE TABLE IF NOT EXISTS cadastro (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        data_nascimento TEXT,
        endereco TEXT,
        email TEXT,
        telefone TEXT,
        contato TEXT,
        camisa TEXT,
        short TEXT,
        chuteira TEXT
    )
''')
conn.commit()
conn.close()

# Rota para a página inicial
@app.route('/')
def index():
    return render_template('index.html')

# Rota para lidar com o envio do formulário
@app.route('/cadastrar', methods=['POST'])
def cadastrar():
    if request.method == 'POST':
        nome = request.form['nome']
        data_nascimento = request.form['data_nascimento']
        endereco = request.form['endereco']
        email = request.form['email']
        telefone = request.form['telefone']
        contato = request.form['contato']
        camisa = request.form['camisa']
        short = request.form['short']
        chuteira = request.form['chuteira']

        # Inserindo dados no banco de dados
        conn = sqlite3.connect('cadastro.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO cadastro (nome, data_nascimento, endereco, email, telefone, contato, camisa, short, chuteira)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (nome, data_nascimento, endereco, email, telefone, contato, camisa, short, chuteira))
        conn.commit()
        conn.close()

        return redirect(url_for('index'))

# Executando o aplicativo Flask
if __name__ == '__main__':
    app.run(debug=True)
