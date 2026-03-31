import tkinter as tk
from tkinter import ttk, messagebox
from styles import (C_WHITE, C_BG, C_BORDER, C_ACCENT, C_TEXT, C_MUTED,
                    C_ROW_ODD, C_ROW_EVEN, FONT_BODY, FONT_H2, FONT_H3,
                    FONT_SMALL, FONT_TITLE, card_frame, field_label,
                    section_header)

ESTADOS_BR = [
    '', 'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
    'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]


class CadastroClienteTab(ttk.Frame):
    def __init__(self, parent, db):
        super().__init__(parent)
        self.db = db
        self.current_cliente_id = None
        self.configure(style='TFrame')
        self._build()

    # ── Layout ────────────────────────────────────────────────────────────────

    def _build(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        hdr = ttk.Frame(self, style='TFrame', padding=(24, 18, 24, 6))
        hdr.grid(row=0, column=0, sticky='ew')
        ttk.Label(hdr, text='Cadastro de Cliente', style='Title.TLabel').pack(side='left')

        content = ttk.Frame(self, style='TFrame', padding=(24, 6, 24, 24))
        content.grid(row=1, column=0, sticky='nsew')
        content.columnconfigure(0, weight=1, minsize=260)
        content.columnconfigure(1, weight=2)
        content.rowconfigure(0, weight=1)

        self._build_list_panel(content)
        self._build_form_panel(content)

    def _build_list_panel(self, parent):
        panel = card_frame(parent, padding=16)
        panel.grid(row=0, column=0, sticky='nsew', padx=(0, 12))
        panel.columnconfigure(0, weight=1)
        panel.rowconfigure(2, weight=1)

        ttk.Label(panel, text='Buscar cliente', style='H2Card.TLabel').grid(
            row=0, column=0, sticky='w', pady=(0, 8))

        search_row = ttk.Frame(panel, style='Card.TFrame')
        search_row.grid(row=1, column=0, sticky='ew', pady=(0, 8))
        search_row.columnconfigure(0, weight=1)

        self.search_var = tk.StringVar()
        self.search_var.trace_add('write', lambda *_: self._refresh_list())
        ent = ttk.Entry(search_row, textvariable=self.search_var)
        ent.grid(row=0, column=0, sticky='ew', ipady=4)

        tree_frame = ttk.Frame(panel, style='Card.TFrame')
        tree_frame.grid(row=2, column=0, sticky='nsew')
        tree_frame.columnconfigure(0, weight=1)
        tree_frame.rowconfigure(0, weight=1)

        self.tree = ttk.Treeview(tree_frame, columns=('nome',), show='headings', selectmode='browse')
        self.tree.heading('nome', text='Nome do Cliente')
        self.tree.column('nome', stretch=True)
        self.tree.tag_configure('odd', background=C_ROW_ODD)
        self.tree.tag_configure('even', background=C_ROW_EVEN)
        self.tree.grid(row=0, column=0, sticky='nsew')
        self.tree.bind('<<TreeviewSelect>>', self._on_select)

        vsb = ttk.Scrollbar(tree_frame, orient='vertical', command=self.tree.yview)
        vsb.grid(row=0, column=1, sticky='ns')
        self.tree.configure(yscrollcommand=vsb.set)

        ttk.Button(panel, text='+ Novo Cliente', command=self._clear_form).grid(
            row=3, column=0, sticky='ew', pady=(8, 0))

        self._refresh_list()

    def _build_form_panel(self, parent):
        # Scrollable card
        outer = card_frame(parent)
        outer.grid(row=0, column=1, sticky='nsew')
        outer.columnconfigure(0, weight=1)
        outer.rowconfigure(0, weight=1)

        canvas = tk.Canvas(outer, bg=C_WHITE, highlightthickness=0)
        canvas.grid(row=0, column=0, sticky='nsew')
        vsb = ttk.Scrollbar(outer, orient='vertical', command=canvas.yview)
        vsb.grid(row=0, column=1, sticky='ns')
        canvas.configure(yscrollcommand=vsb.set)

        panel = tk.Frame(canvas, bg=C_WHITE)
        win = canvas.create_window((0, 0), window=panel, anchor='nw')

        def _on_frame_configure(_e):
            canvas.configure(scrollregion=canvas.bbox('all'))
        def _on_canvas_resize(e):
            canvas.itemconfig(win, width=e.width)

        panel.bind('<Configure>', _on_frame_configure)
        canvas.bind('<Configure>', _on_canvas_resize)
        canvas.bind_all('<MouseWheel>', lambda e: canvas.yview_scroll(int(-1*(e.delta/120)), 'units'))

        panel.columnconfigure(1, weight=1)
        self._panel = panel

        row = 0
        pad = {'padx': 20}

        # Title
        self.form_title = tk.Label(panel, text='Novo Cliente', bg=C_WHITE, fg=C_TEXT, font=FONT_H2)
        self.form_title.grid(row=row, column=0, columnspan=2, sticky='w', padx=20, pady=(16, 4))
        row += 1

        # ── Dados Principais ──────────────────────────────────────────────
        sh = section_header(panel, 'Dados Principais', icon='👤')
        sh.grid(row=row, column=0, columnspan=2, sticky='ew', padx=20)
        row += 1

        fields_main = [
            ('nome',    'Nome completo / Razão social *'),
            ('cpf_cnpj', 'CPF / CNPJ'),
            ('telefone', 'Telefone'),
            ('email',    'E-mail de contato'),
        ]
        self.vars = {}
        for key, label in fields_main:
            self._field_row(panel, row, key, label, **pad)
            row += 1

        # ── Endereço ──────────────────────────────────────────────────────
        sh2 = section_header(panel, 'Endereço de Correspondência', icon='📍')
        sh2.grid(row=row, column=0, columnspan=2, sticky='ew', padx=20)
        row += 1

        self._field_row(panel, row, 'cep', 'CEP', width=12, **pad)
        row += 1

        # Logradouro + Número on same row
        lf = tk.Frame(panel, bg=C_WHITE)
        lf.grid(row=row, column=0, columnspan=2, sticky='ew', padx=20, pady=3)
        lf.columnconfigure(0, weight=3)
        lf.columnconfigure(1, weight=1)
        tk.Label(lf, text='Logradouro', bg=C_WHITE, fg=C_MUTED, font=FONT_SMALL).grid(
            row=0, column=0, sticky='w')
        tk.Label(lf, text='Número', bg=C_WHITE, fg=C_MUTED, font=FONT_SMALL).grid(
            row=0, column=1, sticky='w', padx=(8, 0))
        self.vars['logradouro'] = tk.StringVar()
        ttk.Entry(lf, textvariable=self.vars['logradouro']).grid(
            row=1, column=0, sticky='ew', ipady=4, padx=(0, 4))
        self.vars['numero'] = tk.StringVar()
        ttk.Entry(lf, textvariable=self.vars['numero']).grid(
            row=1, column=1, sticky='ew', ipady=4, padx=(4, 0))
        row += 1

        self._field_row(panel, row, 'complemento', 'Complemento / Bairro', **pad)
        row += 1

        # Cidade + Estado on same row
        cf = tk.Frame(panel, bg=C_WHITE)
        cf.grid(row=row, column=0, columnspan=2, sticky='ew', padx=20, pady=3)
        cf.columnconfigure(0, weight=3)
        cf.columnconfigure(1, weight=1)
        tk.Label(cf, text='Cidade', bg=C_WHITE, fg=C_MUTED, font=FONT_SMALL).grid(
            row=0, column=0, sticky='w')
        tk.Label(cf, text='Estado (UF)', bg=C_WHITE, fg=C_MUTED, font=FONT_SMALL).grid(
            row=0, column=1, sticky='w', padx=(8, 0))
        self.vars['cidade'] = tk.StringVar()
        ttk.Entry(cf, textvariable=self.vars['cidade']).grid(
            row=1, column=0, sticky='ew', ipady=4, padx=(0, 4))
        self.vars['estado'] = tk.StringVar()
        ttk.Combobox(cf, textvariable=self.vars['estado'],
                     values=ESTADOS_BR, state='readonly', width=6).grid(
            row=1, column=1, sticky='ew', ipady=4, padx=(4, 0))
        row += 1

        # ── Representante Legal ───────────────────────────────────────────
        sh3 = section_header(panel, 'Representante Legal (PJ)', icon='🏛')
        sh3.grid(row=row, column=0, columnspan=2, sticky='ew', padx=20)
        row += 1

        self._field_row(panel, row, 'nome_representante', 'Nome do representante', **pad)
        row += 1

        # ── Observações ───────────────────────────────────────────────────
        sh4 = section_header(panel, 'Observações Internas', icon='📝')
        sh4.grid(row=row, column=0, columnspan=2, sticky='ew', padx=20)
        row += 1

        tk.Label(panel, text='Notas e observações sobre o cliente',
                 bg=C_WHITE, fg=C_MUTED, font=FONT_SMALL).grid(
            row=row, column=0, columnspan=2, sticky='w', padx=20, pady=(0, 2))
        row += 1
        obs_f = tk.Frame(panel, bg=C_WHITE)
        obs_f.grid(row=row, column=0, columnspan=2, sticky='ew', padx=20, pady=(0, 6))
        obs_f.columnconfigure(0, weight=1)
        self.obs_text = tk.Text(obs_f, height=4, wrap='word',
                                font=FONT_BODY, bg=C_WHITE, fg=C_TEXT,
                                relief='flat', bd=1,
                                highlightthickness=1, highlightcolor=C_ACCENT,
                                highlightbackground=C_BORDER)
        self.obs_text.grid(row=0, column=0, sticky='ew')
        row += 1

        # Buttons
        btn_row = tk.Frame(panel, bg=C_WHITE)
        btn_row.grid(row=row, column=0, columnspan=2, sticky='e', padx=20, pady=(8, 4))
        ttk.Button(btn_row, text='Cancelar', style='Secondary.TButton',
                   command=self._clear_form).pack(side='left', padx=(0, 8))
        ttk.Button(btn_row, text='Salvar Cadastro', command=self._save).pack(side='left')
        row += 1

        self.status_lbl = tk.Label(panel, text='', bg=C_WHITE, fg=C_ACCENT, font=FONT_SMALL)
        self.status_lbl.grid(row=row, column=0, columnspan=2, sticky='w', padx=20, pady=(4, 16))

    def _field_row(self, panel, row, key, label, width=None, **grid_kwargs):
        tk.Label(panel, text=label, bg=C_WHITE, fg=C_MUTED, font=FONT_SMALL).grid(
            row=row, column=0, columnspan=2, sticky='w', pady=(0, 1), **grid_kwargs)
        v = tk.StringVar()
        self.vars[key] = v
        kw = {'ipady': 4, 'pady': (0, 6)}
        if width:
            ttk.Entry(panel, textvariable=v, width=width).grid(
                row=row, column=0, columnspan=2, sticky='w', **kw, **grid_kwargs)
        else:
            ttk.Entry(panel, textvariable=v).grid(
                row=row, column=0, columnspan=2, sticky='ew', **kw, **grid_kwargs)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _refresh_list(self):
        self.tree.delete(*self.tree.get_children())
        q = self.search_var.get().strip()
        clientes = self.db.search_clientes(q) if q else self.db.get_all_clientes()
        for i, c in enumerate(clientes):
            tag = 'odd' if i % 2 else 'even'
            self.tree.insert('', 'end', iid=str(c['id']), values=(c['nome'],), tags=(tag,))

    def _on_select(self, _event=None):
        sel = self.tree.selection()
        if not sel:
            return
        cid = int(sel[0])
        c = self.db.get_cliente(cid)
        if not c:
            return
        self.current_cliente_id = cid
        self.form_title.config(text='Editar Cliente')
        self.vars['nome'].set(c['nome'] or '')
        self.vars['cpf_cnpj'].set(c['cpf_cnpj'] or '')
        self.vars['telefone'].set(c['telefone'] or '')
        self.vars['email'].set(c['email'] or '')
        self.vars['cep'].set(c['cep'] or '')
        self.vars['logradouro'].set(c['logradouro'] or '')
        self.vars['numero'].set(c['numero'] or '')
        self.vars['complemento'].set(c['complemento'] or '')
        self.vars['cidade'].set(c['cidade'] or '')
        self.vars['estado'].set(c['estado'] or '')
        self.vars['nome_representante'].set(c['nome_representante'] or '')
        self.obs_text.delete('1.0', 'end')
        self.obs_text.insert('1.0', c['observacoes'] or '')
        self.status_lbl.config(text='')

    def _clear_form(self):
        self.current_cliente_id = None
        self.form_title.config(text='Novo Cliente')
        for v in self.vars.values():
            v.set('')
        self.obs_text.delete('1.0', 'end')
        self.status_lbl.config(text='')
        self.tree.selection_remove(self.tree.selection())

    def _save(self):
        nome = self.vars['nome'].get().strip()
        if not nome:
            messagebox.showwarning('Atenção', 'O nome do cliente é obrigatório.')
            return

        cpf_cnpj   = self.vars['cpf_cnpj'].get().strip()
        telefone   = self.vars['telefone'].get().strip()
        email      = self.vars['email'].get().strip()
        cep        = self.vars['cep'].get().strip()
        logradouro = self.vars['logradouro'].get().strip()
        numero     = self.vars['numero'].get().strip()
        complemento = self.vars['complemento'].get().strip()
        cidade     = self.vars['cidade'].get().strip()
        estado     = self.vars['estado'].get().strip()
        nome_repr  = self.vars['nome_representante'].get().strip()
        obs        = self.obs_text.get('1.0', 'end').strip()

        if self.current_cliente_id:
            self.db.update_cliente(
                self.current_cliente_id, nome, cpf_cnpj, telefone, email,
                cep, logradouro, numero, complemento, cidade, estado,
                nome_repr, obs
            )
            self.status_lbl.config(text='Cliente atualizado com sucesso.')
        else:
            self.db.insert_cliente(
                nome, cpf_cnpj, telefone, email,
                cep, logradouro, numero, complemento, cidade, estado,
                nome_repr, obs
            )
            self.status_lbl.config(text='Cliente cadastrado com sucesso.')
            self._clear_form()

        self._refresh_list()
