/**
 * ==========================================================================
 * PRO SAVDO VA QARZLAR BOSHQARUVI — JAVASCRIPT MOTOR (ENTERPRISE ERP ENGINE)
 * Telefon va kompyuter uchun 100% moslashgan interaktiv motor
 * ==========================================================================
 */

const ProApp = {
  stores: [],
  searchQuery: '',
  statusFilter: 'all',
  sortBy: 'debt-desc',
  activeStoreId: null,
  currentTheme: 'light',

  init() {
    this.initTheme();
    this.initClock();
    this.loadData();
    this.initResponsiveView();
    this.render();
  },

  // Mavzuni boshqarish (White / Dark mode)
  initTheme() {
    const saved = localStorage.getItem('pro_erp_theme');
    if (saved) {
      this.setTheme(saved, false);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light', false);
    }
  },

  setTheme(theme, notify = true) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pro_erp_theme', theme);

    const icon = document.getElementById('themeToggleIcon');
    const text = document.getElementById('themeToggleText');
    const btn = document.getElementById('themeToggleBtn');
    if (icon) {
      if (theme === 'dark') {
        icon.textContent = '☀️';
        if (text) text.textContent = 'Kun';
        if (btn) btn.title = "Yorug' rejimga o'tish (Kun)";
      } else {
        icon.textContent = '🌙';
        if (text) text.textContent = 'Tun';
        if (btn) btn.title = "Qorong'u rejimga o'tish (Tun)";
      }
    }

    if (notify) {
      this.showToast(theme === 'dark' ? "Qorong'u (Dark) rejim yoqildi" : "Yorug' (White) rejim yoqildi", "info");
    }
  },

  toggleTheme() {
    const next = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(next, true);
  },

  // 1. Jonli soat va sana
  initClock() {
    const updateTime = () => {
      const now = new Date();
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const dateStr = now.toLocaleDateString('uz-UZ', options);
      const timeStr = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const clockEl = document.getElementById('liveClockText');
      if (clockEl) {
        clockEl.textContent = `${dateStr} | ${timeStr}`;
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  },

  // Ekran o'lchamiga qarab standart ko'rinishni belgilash
  initResponsiveView() {
    if (window.innerWidth <= 768) {
      this.switchView('cards');
    } else {
      this.switchView('table');
    }
  },

  switchView(mode) {
    this.currentViewMode = mode;
    const tableWrap = document.getElementById('desktopTableWrapper');
    const cardsWrap = document.getElementById('mobileCardsContainer');
    const btnCards = document.getElementById('btnViewCards');
    const btnTable = document.getElementById('btnViewTable');

    if (mode === 'table') {
      if (tableWrap) tableWrap.classList.remove('m-hide');
      if (cardsWrap) cardsWrap.style.display = 'none';
      if (btnTable) btnTable.classList.add('active');
      if (btnCards) btnCards.classList.remove('active');
    } else {
      if (tableWrap) tableWrap.classList.add('m-hide');
      if (cardsWrap) cardsWrap.style.display = 'flex';
      if (btnCards) btnCards.classList.add('active');
      if (btnTable) btnTable.classList.remove('active');
    }
  },

  // 2. Xotiradan ma'lumotlarni yuklash va saqlash
  loadData() {
    try {
      const saved = localStorage.getItem('pro_erp_stores_v1');
      if (saved) {
        this.stores = JSON.parse(saved);
      } else {
        this.stores = [];
      }
    } catch (e) {
      console.error("Ma'lumot yuklashda xato:", e);
      this.stores = [];
    }
  },

  saveData() {
    try {
      localStorage.setItem('pro_erp_stores_v1', JSON.stringify(this.stores));
    } catch (e) {
      console.error("Ma'lumot saqlashda xato:", e);
    }
  },

  // 3. Hisob-kitob formulalari (Avtomatik qoldiq qarz)
  calculateStore(store) {
    const initialDebt = Number(store.initialDebt) || 0;
    const deliveredGoods = Number(store.deliveredGoods) || 0;
    const paidAmount = Number(store.paidAmount) || 0;

    const totalLiability = initialDebt + deliveredGoods;
    const remainingDebt = totalLiability - paidAmount;

    return {
      initialDebt,
      deliveredGoods,
      paidAmount,
      totalLiability,
      remainingDebt: remainingDebt > 0 ? remainingDebt : 0,
      isClean: remainingDebt <= 0
    };
  },

  // Valyuta formatlash (15 000 000 so'm)
  formatMoney(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return "0 so'm";
    return new Intl.NumberFormat('uz-UZ').format(Math.round(amount)) + " so'm";
  },

  // Filtrlangan do'konlar ro'yxatini olish
  getFilteredStores() {
    let filtered = [...this.stores];

    // Qidiruv
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.contact && s.contact.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
      );
    }

    // Holat filtri
    if (this.statusFilter === 'debtors') {
      filtered = filtered.filter(s => this.calculateStore(s).remainingDebt > 0);
    } else if (this.statusFilter === 'clean') {
      filtered = filtered.filter(s => this.calculateStore(s).remainingDebt <= 0);
    } else if (this.statusFilter === 'largeDebt') {
      filtered = filtered.filter(s => this.calculateStore(s).remainingDebt >= 10000000);
    }

    // Saralash
    filtered.sort((a, b) => {
      const cA = this.calculateStore(a);
      const cB = this.calculateStore(b);
      if (this.sortBy === 'debt-desc') return cB.remainingDebt - cA.remainingDebt;
      if (this.sortBy === 'debt-asc') return cA.remainingDebt - cB.remainingDebt;
      if (this.sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (this.sortBy === 'goods-desc') return cB.deliveredGoods - cA.deliveredGoods;
      return 0;
    });

    return filtered;
  },

  // 4. Ekranni to'liq yangilash (Render)
  render() {
    this.renderKPIs();
    const filtered = this.getFilteredStores();
    this.renderTable(filtered);
    this.renderMobileCards(filtered);
  },

  renderKPIs() {
    const elStoreCount = document.getElementById('kpiStoreCount');
    if (!elStoreCount) return;

    let sumDelivered = 0;
    let sumPaid = 0;
    let sumDebt = 0;
    let debtorCount = 0;

    this.stores.forEach(s => {
      const c = this.calculateStore(s);
      sumDelivered += c.deliveredGoods;
      sumPaid += c.paidAmount;
      sumDebt += c.remainingDebt;
      if (c.remainingDebt > 0) debtorCount++;
    });

    elStoreCount.textContent = this.stores.length + " ta";
    const elDebtorCount = document.getElementById('kpiDebtorCountText');
    if (elDebtorCount) elDebtorCount.textContent = `${debtorCount} ta qarzdor`;
    const elDelivered = document.getElementById('kpiDelivered');
    if (elDelivered) elDelivered.textContent = this.formatMoney(sumDelivered);
    const elPaid = document.getElementById('kpiPaid');
    if (elPaid) elPaid.textContent = this.formatMoney(sumPaid);
    const elDebt = document.getElementById('kpiDebt');
    if (elDebt) elDebt.textContent = this.formatMoney(sumDebt);
  },

  // Kompyuter Jadvalini Render Qilish
  renderTable(filtered) {
    const tbody = document.getElementById('storeTableBody');
    const tfoot = document.getElementById('storeTableFoot');

    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 3.5rem 1rem; color: #64748b;">
            <div style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.4rem; color: #1e293b;">
              Hech qanday ma'lumot topilmadi
            </div>
            <p style="font-size: 0.95rem;">
              Yangi do'kon qo'shish uchun yuqoridagi <strong>"➕ Yangi Do'kon"</strong> tugmasini bosing.
            </p>
          </td>
        </tr>
      `;
      tfoot.innerHTML = '';
      return;
    }

    let totInit = 0;
    let totDelivered = 0;
    let totPaid = 0;
    let totDebt = 0;

    filtered.forEach((store, index) => {
      const c = this.calculateStore(store);
      totInit += c.initialDebt;
      totDelivered += c.deliveredGoods;
      totPaid += c.paidAmount;
      totDebt += c.remainingDebt;

      const cleanPhone = store.phone ? store.phone.replace(/[^0-9+]/g, '') : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center; font-weight: 700; color: #64748b;">${index + 1}</td>
        
        <td>
          <div class="store-title">
            <span>🏪</span> ${store.name}
          </div>
          <div class="store-meta">
            ${store.address ? '📍 ' + store.address : 'Manzil ko\'rsatilmagan'}
          </div>
        </td>

        <td class="contact-cell">
          <div class="contact-name">${store.contact || '-'}</div>
          <div class="contact-phone">
            ${store.phone ? `<a href="tel:${cleanPhone}">📞 ${store.phone}</a>` : '-'}
          </div>
        </td>

        <td class="num-cell text-right">${this.formatMoney(c.initialDebt)}</td>
        
        <td class="num-cell text-right num-chiqim">+ ${this.formatMoney(c.deliveredGoods)}</td>
        
        <td class="num-cell text-right num-kirim">- ${this.formatMoney(c.paidAmount)}</td>
        
        <td class="text-right">
          ${c.remainingDebt > 0 
            ? `<span class="debt-badge-value">${this.formatMoney(c.remainingDebt)}</span>` 
            : `<span class="zero-debt-value">0 so'm</span>`}
        </td>

        <td class="text-center">
          ${c.remainingDebt > 0 
            ? `<span class="status-pill status-has-debt">🔴 Qarzdor</span>` 
            : `<span class="status-pill status-clean">🟢 To'langan</span>`}
        </td>

        <td class="text-center action-col">
          <div class="action-btn-group">
            <button class="btn-table-action btn-action-finance" onclick="ProApp.openFinanceModal(${store.id})" title="Pul qabul qilish yoki tovar berish">
              💳 Moliya
            </button>
            <button class="btn-table-action" onclick="ProApp.openStatementModal(${store.id})" title="Akt-sverka">
              📋 Hujjat
            </button>
            <button class="btn-table-action btn-action-sms" onclick="ProApp.openSmsModal(${store.id})" title="Telegram / SMS xabari">
              📲 SMS
            </button>
            <button class="btn-table-action" onclick="ProApp.editStore(${store.id})" title="Tahrirlash">
              ✏️
            </button>
            <button class="btn-table-action btn-action-del" onclick="ProApp.deleteStore(${store.id})" title="O'chirish">
              ✕
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // JAMI SATRI
    tfoot.innerHTML = `
      <tr>
        <td style="text-align: center;">∑</td>
        <td class="tfoot-label" colspan="2">JAMI YIG'INDI (UMUMIY):</td>
        <td class="num-cell text-right">${this.formatMoney(totInit)}</td>
        <td class="num-cell text-right num-chiqim">${this.formatMoney(totDelivered)}</td>
        <td class="num-cell text-right num-kirim">${this.formatMoney(totPaid)}</td>
        <td class="num-cell text-right" style="color: var(--danger); font-size: 1.25rem;">${this.formatMoney(totDebt)}</td>
        <td colspan="2"></td>
      </tr>
    `;
  },

  // Telefonlar Uchun Qulay Karta Ko'rinishini Render Qilish
  renderMobileCards(filtered) {
    const container = document.getElementById('mobileCardsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; color: #64748b;">
          <div style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.35rem; color: #1e293b;">
            Hech qanday do'kon topilmadi
          </div>
          <p style="font-size: 0.9rem;">
            Do'kon qo'shish uchun yuqoridagi <strong>"➕ Yangi Do'kon"</strong> tugmasini bosing.
          </p>
        </div>
      `;
      return;
    }

    filtered.forEach((store) => {
      const c = this.calculateStore(store);
      const cleanPhone = store.phone ? store.phone.replace(/[^0-9+]/g, '') : '';

      const card = document.createElement('div');
      card.className = 'store-card-mobile';

      card.innerHTML = `
        <div class="card-m-header">
          <div>
            <div class="card-m-title">🏪 ${store.name}</div>
            <div class="card-m-meta">
              ${store.address ? `<span>📍 ${store.address}</span>` : ''}
              ${store.contact ? `<span>👤 ${store.contact}</span>` : ''}
              ${store.phone ? `<a href="tel:${cleanPhone}">📞 ${store.phone} (Qo'ng'iroq qilish)</a>` : ''}
            </div>
          </div>
          <div>
            ${c.remainingDebt > 0 
              ? `<span class="status-pill status-has-debt">🔴 Qarzdor</span>` 
              : `<span class="status-pill status-clean">🟢 To'langan</span>`}
          </div>
        </div>

        <div class="card-m-stats">
          <div class="card-m-stat-item">
            <span class="stat-item-label">Eski qarz</span>
            <span class="stat-item-val">${this.formatMoney(c.initialDebt)}</span>
          </div>
          <div class="card-m-stat-item">
            <span class="stat-item-label">Chiqim (Tovar)</span>
            <span class="stat-item-val num-chiqim">+ ${this.formatMoney(c.deliveredGoods)}</span>
          </div>
          <div class="card-m-stat-item">
            <span class="stat-item-label">Kirim (To'lov)</span>
            <span class="stat-item-val num-kirim">- ${this.formatMoney(c.paidAmount)}</span>
          </div>
        </div>

        <div class="card-m-debt-row ${c.isClean ? 'clean' : ''}">
          <span class="card-m-debt-label">QOLDIQ QARZ:</span>
          <span class="card-m-debt-val">${this.formatMoney(c.remainingDebt)}</span>
        </div>

        <div class="card-m-actions">
          <button class="card-m-btn card-m-btn-pay" onclick="ProApp.openFinanceModal(${store.id})">
            💳 Moliya
          </button>
          <button class="card-m-btn" onclick="ProApp.openStatementModal(${store.id})">
            📋 Hujjat
          </button>
          <button class="card-m-btn card-m-btn-sms" onclick="ProApp.openSmsModal(${store.id})">
            📲 SMS
          </button>
          <button class="card-m-btn" onclick="ProApp.editStore(${store.id})" title="Tahrirlash">
            ✏️
          </button>
          <button class="card-m-btn card-m-btn-del" onclick="ProApp.deleteStore(${store.id})" title="O'chirish">
            ✕
          </button>
        </div>
      `;

      container.appendChild(card);
    });
  },

  // 5. Qidiruv va Filtr handlerlari
  handleSearch(val) {
    this.searchQuery = val;
    this.render();
  },

  handleStatusFilter(val) {
    this.statusFilter = val;
    this.render();
  },

  handleSort(val) {
    this.sortBy = val;
    this.render();
  },

  // 6. Do'kon qo'shish / Tahrirlash
  openStoreModal(storeId = null) {
    const modal = document.getElementById('modalStore');
    const title = document.getElementById('modalStoreTitle');

    if (storeId) {
      const store = this.stores.find(s => s.id === storeId);
      if (!store) return;
      document.getElementById('editStoreId').value = store.id;
      document.getElementById('inputStoreName').value = store.name || '';
      document.getElementById('inputContactName').value = store.contact || '';
      document.getElementById('inputPhone').value = store.phone || '';
      document.getElementById('inputAddress').value = store.address || '';
      document.getElementById('inputInitialDebt').value = store.initialDebt || 0;
      document.getElementById('inputDueDate').value = store.dueDate || '';
      document.getElementById('inputNotes').value = store.notes || '';
      title.textContent = `✏️ "${store.name}" tahrirlash`;
    } else {
      document.getElementById('editStoreId').value = '';
      document.getElementById('inputStoreName').value = '';
      document.getElementById('inputContactName').value = '';
      document.getElementById('inputPhone').value = '';
      document.getElementById('inputAddress').value = '';
      document.getElementById('inputInitialDebt').value = '';
      document.getElementById('inputDueDate').value = '';
      document.getElementById('inputNotes').value = '';
      title.textContent = '🏢 Yangi Do\'kon Qo\'shish';
    }

    modal.classList.add('active');
  },

  editStore(id) {
    this.openStoreModal(id);
  },

  handleStoreSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('editStoreId').value;
    const name = document.getElementById('inputStoreName').value.trim();
    const contact = document.getElementById('inputContactName').value.trim();
    const phone = document.getElementById('inputPhone').value.trim();
    const address = document.getElementById('inputAddress').value.trim();
    const initialDebt = Number(document.getElementById('inputInitialDebt').value) || 0;
    const dueDate = document.getElementById('inputDueDate').value;
    const notes = document.getElementById('inputNotes').value.trim();

    if (!name) {
      alert("Iltimos, do'kon nomini kiriting!");
      return;
    }

    const today = new Date().toLocaleDateString('uz-UZ');

    if (editId) {
      const store = this.stores.find(s => s.id === Number(editId));
      if (store) {
        store.name = name;
        store.contact = contact;
        store.phone = phone;
        store.address = address;
        store.initialDebt = initialDebt;
        store.dueDate = dueDate;
        store.notes = notes;
        this.showToast(`"${name}" yangilandi!`, 'success');
      }
    } else {
      const newStore = {
        id: Date.now(),
        name,
        contact,
        phone,
        address,
        initialDebt,
        deliveredGoods: 0,
        paidAmount: 0,
        dueDate,
        notes,
        createdAt: today,
        history: []
      };

      if (initialDebt > 0) {
        newStore.history.push({
          date: today,
          type: "Boshlang'ich qarz",
          method: "Boshlang'ich",
          delivered: initialDebt,
          paid: 0,
          note: "Tizimga kiritilgan boshlang'ich qarz"
        });
      }

      this.stores.push(newStore);
      this.showToast(`"${name}" muvaffaqiyatli qo'shildi!`, 'success');
    }

    this.saveData();
    this.render();
    this.closeModal('modalStore');
  },

  // 7. Moliya Amaliyotlari (Pul olish / Tovar berish)
  openFinanceModal(storeId) {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) return;

    this.activeStoreId = storeId;
    const c = this.calculateStore(store);

    document.getElementById('financeStoreId').value = store.id;
    document.getElementById('financeStoreName').textContent = store.name;
    document.getElementById('financeCurrentDebt').textContent = this.formatMoney(c.remainingDebt);
    document.getElementById('financeAmount').value = '';
    document.getElementById('financeNote').value = '';
    document.getElementById('financeDate').value = new Date().toISOString().split('T')[0];
    
    this.selectTransType('payment');
    this.updateFinanceAmountPreview();
    document.getElementById('modalFinance').classList.add('active');

    setTimeout(() => {
      const input = document.getElementById('financeAmount');
      if (input) input.focus();
    }, 150);
  },

  selectTransType(type) {
    document.getElementById('financeTransType').value = type;
    const cardPay = document.getElementById('cardTypePay');
    const cardGoods = document.getElementById('cardTypeGoods');

    if (type === 'payment') {
      if (cardPay) cardPay.className = 'type-option-card selected-pay';
      if (cardGoods) cardGoods.className = 'type-option-card';
    } else {
      if (cardPay) cardPay.className = 'type-option-card';
      if (cardGoods) cardGoods.className = 'type-option-card selected-goods';
    }

    this.updateFinanceAmountPreview();
  },

  updateFinanceAmountPreview() {
    const input = document.getElementById('financeAmount');
    const badge = document.getElementById('financePreviewBadge');
    const preview = document.getElementById('financePreviewText');
    const label = document.getElementById('financeAmountLabel');
    const typeEl = document.getElementById('financeTransType');
    const type = typeEl ? typeEl.value : 'payment';
    const amountVal = Number(input ? input.value : 0) || 0;

    if (type === 'payment') {
      if (badge) {
        badge.textContent = '🟢 Kirim (Qabul qilingan pul)';
        badge.className = 'preview-badge badge-kirim';
      }
      if (label) label.textContent = "Kirim summasi (so'm) *";
      if (input) input.style.borderColor = 'var(--success)';
    } else {
      if (badge) {
        badge.textContent = '📦 Chiqim (Yetkazilgan tovar)';
        badge.className = 'preview-badge badge-chiqim';
      }
      if (label) label.textContent = "Chiqim summasi (so'm) *";
      if (input) input.style.borderColor = 'var(--accent)';
    }

    if (preview) {
      preview.textContent = this.formatMoney(amountVal);
    }
  },

  handleFinanceSubmit(e) {
    e.preventDefault();
    const id = Number(document.getElementById('financeStoreId').value);
    const type = document.getElementById('financeTransType').value;
    const amount = Number(document.getElementById('financeAmount').value) || 0;
    const method = document.getElementById('financeMethod').value;
    const dateInput = document.getElementById('financeDate').value;
    const note = document.getElementById('financeNote').value.trim();

    if (amount <= 0) {
      alert("Iltimos, summani to'g'ri kiriting!");
      return;
    }

    const store = this.stores.find(s => s.id === id);
    if (!store) return;

    if (!store.history) store.history = [];
    const dateFormatted = dateInput ? new Date(dateInput).toLocaleDateString('uz-UZ') : new Date().toLocaleDateString('uz-UZ');

    if (type === 'payment') {
      store.paidAmount = (Number(store.paidAmount) || 0) + amount;
      store.history.push({
        date: dateFormatted,
        type: "Pul qabul qilindi",
        method: method,
        delivered: 0,
        paid: amount,
        note: note || `${method} orqali to'lov`
      });
      this.showToast(`${this.formatMoney(amount)} to'lov qabul qilindi!`, 'success');
    } else {
      store.deliveredGoods = (Number(store.deliveredGoods) || 0) + amount;
      store.history.push({
        date: dateFormatted,
        type: "Tovar yetkazildi",
        method: method,
        delivered: amount,
        paid: 0,
        note: note || "Mahsulot yetkazib berildi"
      });
      this.showToast(`${this.formatMoney(amount)} tovar qo'shildi!`, 'info');
    }

    this.saveData();
    this.render();
    this.closeModal('modalFinance');
  },

  // 8. Rasmiy Akt-Sverka (O'zaro Hisob-kitob Varaqasi)
  openStatementModal(storeId) {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) return;

    const c = this.calculateStore(store);
    const today = new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });

    document.getElementById('statementTitle').textContent = `"${store.name}" — O'zaro Hisob-Kitob Varaqasi`;
    document.getElementById('statementContact').textContent = `Mas'ul: ${store.contact || '-'} | Tel: ${store.phone || '-'}`;
    document.getElementById('statementAddress').textContent = `Manzil: ${store.address || '-'}`;
    document.getElementById('statementDatePrint').textContent = today;

    document.getElementById('statementSummaryStats').innerHTML = `
      <div>Boshlang'ich qarz: <strong>${this.formatMoney(c.initialDebt)}</strong></div>
      <div>Jami Chiqim (Tovar): <strong class="num-chiqim">+ ${this.formatMoney(c.deliveredGoods)}</strong></div>
      <div>Jami Kirim (To'lov): <strong class="num-kirim">- ${this.formatMoney(c.paidAmount)}</strong></div>
      <div>Qoldiq qarz: <strong style="color: var(--danger); font-size: 1.1rem;">${this.formatMoney(c.remainingDebt)}</strong></div>
    `;

    const tbody = document.getElementById('statementTableBody');
    tbody.innerHTML = '';

    if (!store.history || store.history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: #64748b;">Tranzaksiyalar tarixi mavjud emas</td></tr>`;
    } else {
      store.history.forEach((h, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="text-align: center;">${idx + 1}</td>
          <td>${h.date}</td>
          <td style="font-weight: 600;">${h.type}</td>
          <td>${h.method || 'Naqd'}</td>
          <td class="text-right num-cell ${h.delivered > 0 ? 'num-chiqim' : ''}">
            ${h.delivered > 0 ? '+ ' + this.formatMoney(h.delivered) : '-'}
          </td>
          <td class="text-right num-cell ${h.paid > 0 ? 'num-kirim' : ''}">
            ${h.paid > 0 ? '- ' + this.formatMoney(h.paid) : '-'}
          </td>
          <td style="font-size: 0.85rem; color: #64748b;">${h.note || '-'}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.getElementById('modalStatement').classList.add('active');
  },

  // 9. Telegram / SMS Xabari
  openSmsModal(storeId) {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) return;

    this.activeStoreId = storeId;
    const c = this.calculateStore(store);
    const today = new Date().toLocaleDateString('uz-UZ');

    let msg = `Assalomu alaykum, "${store.name}" rahbariyati!\n\n`;
    msg += `${today} holatiga siz bilan o'zaro hisob-kitob bo'yicha qoldiq qarz miqdori: ${this.formatMoney(c.remainingDebt)}.\n`;
    if (store.dueDate) {
      msg += `To'lovning rejalashtirilgan muddati: ${store.dueDate}.\n`;
    }
    msg += `Iltimos, hisob-kitobni amalga oshirishingizni so'raymiz.\n\n`;
    msg += `Hurmat bilan, Ta'minot va hisob-kitob bo'limi.`;

    document.getElementById('smsTextContent').value = msg;
    document.getElementById('modalSms').classList.add('active');
  },

  copySmsText() {
    const textEl = document.getElementById('smsTextContent');
    textEl.select();
    navigator.clipboard.writeText(textEl.value).then(() => {
      this.showToast("Xabar matni nusxalandi!", "success");
    }).catch(() => {
      document.execCommand('copy');
      this.showToast("Xabar matni nusxalandi!", "success");
    });
  },

  sendViaTelegram() {
    const text = encodeURIComponent(document.getElementById('smsTextContent').value);
    let url = `https://t.me/share/url?url=${text}`;
    window.open(url, '_blank');
  },

  // 10. Do'konni o'chirish
  deleteStore(id) {
    const store = this.stores.find(s => s.id === id);
    if (!store) return;

    if (confirm(`Haqiqatan ham "${store.name}" do'konini va barcha tarixini o'chirmoqchimisiz?`)) {
      this.stores = this.stores.filter(s => s.id !== id);
      this.saveData();
      this.render();
      this.showToast(`"${store.name}" o'chirildi!`, "info");
    }
  },

  confirmClearAll() {
    if (confirm("Diqqat! Barcha do'konlar va ularning hisob-kitoblar tarixi butunlay o'chiriladi. Rozimisiz?")) {
      this.stores = [];
      this.saveData();
      this.render();
      this.showToast("Barcha ma'lumotlar tozalandi!", "info");
    }
  },

  // 11. Zaxira Nusxa (Backup & Restore JSON)
  openBackupModal() {
    document.getElementById('modalBackup').classList.add('active');
  },

  downloadBackupFile() {
    const jsonStr = JSON.stringify(this.stores, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dokonlar_Qarz_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast("Zaxira fayl saqlandi!", "success");
  },

  restoreBackupFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          if (confirm(`${parsed.length} ta do'kon ma'lumoti topildi. Tiklashni tasdiqlaysizmi?`)) {
            this.stores = parsed;
            this.saveData();
            this.render();
            this.closeModal('modalBackup');
            this.showToast("Ma'lumotlar zaxiradan tiklandi!", "success");
          }
        } else {
          alert("Fayl formati noto'g'ri!");
        }
      } catch (err) {
        alert("Faylni o'qishda xatolik yuz berdi!");
      }
    };
    reader.readAsText(file);
  },

  // Modalni yopish
  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  },

  // Bildirishnoma (Toast)
  showToast(message, type = 'info') {
    const toast = document.getElementById('proToast');
    if (!toast) return;

    toast.className = `toast-notice show toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : 'ℹ'}</span> <span>${message}</span>`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }
};

/**
 * ==========================================================================
 * PRO SAVDO VA HISOB-KITOB KALKULYATORI (FINANCIAL SMART CALCULATOR)
 * O'zaro hisob-kitoblar, tovar va to'lovlarni tezkor hisoblash moduli
 * ==========================================================================
 */
const ProCalc = {
  currentInput: '0',
  previousInput: null,
  operation: null,
  formula: '',
  isNewInput: false,
  isOpen: false,
  isMinimized: false,
  showHistory: false,
  history: [],

  init() {
    this.loadHistory();
    this.bindEvents();
    this.updateDisplay();
  },

  loadHistory() {
    try {
      const saved = localStorage.getItem('pro_erp_calc_history');
      if (saved) {
        this.history = JSON.parse(saved);
      } else {
        this.history = [];
      }
    } catch (e) {
      this.history = [];
    }
  },

  saveHistory() {
    try {
      localStorage.setItem('pro_erp_calc_history', JSON.stringify(this.history.slice(0, 30)));
    } catch (e) {}
  },

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  open() {
    this.isOpen = true;
    this.isMinimized = false;
    const card = document.getElementById('proCalcCard');
    if (card) {
      card.classList.add('active');
      card.classList.remove('minimized');
    }
    const btn = document.getElementById('floatingCalcBtn');
    if (btn) btn.classList.add('calc-active');
  },

  close() {
    this.isOpen = false;
    const card = document.getElementById('proCalcCard');
    if (card) card.classList.remove('active');
    const btn = document.getElementById('floatingCalcBtn');
    if (btn) btn.classList.remove('calc-active');
  },

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    const card = document.getElementById('proCalcCard');
    if (card) {
      card.classList.toggle('minimized', this.isMinimized);
    }
  },

  toggleHistory() {
    this.showHistory = !this.showHistory;
    const panel = document.getElementById('calcHistoryPanel');
    const btn = document.getElementById('calcHistoryToggleBtn');
    if (panel) {
      panel.classList.toggle('active', this.showHistory);
      if (this.showHistory) {
        this.renderHistory();
      }
    }
    if (btn) {
      btn.classList.toggle('active', this.showHistory);
    }
  },

  appendDigit(digit) {
    if (this.isNewInput) {
      this.currentInput = digit === '00' ? '0' : digit;
      this.isNewInput = false;
    } else {
      if (this.currentInput === '0') {
        if (digit === '0' || digit === '00') return;
        this.currentInput = digit;
      } else {
        if (this.currentInput.replace(/[^\d]/g, '').length < 15) {
          this.currentInput += digit;
        }
      }
    }
    this.updateDisplay();
  },

  appendDot() {
    if (this.isNewInput) {
      this.currentInput = '0.';
      this.isNewInput = false;
    } else if (!this.currentInput.includes('.')) {
      this.currentInput += '.';
    }
    this.updateDisplay();
  },

  deleteChar() {
    if (this.isNewInput) {
      this.currentInput = '0';
      this.isNewInput = false;
    } else {
      if (this.currentInput.length > 1) {
        if (this.currentInput.length === 2 && this.currentInput.startsWith('-')) {
          this.currentInput = '0';
        } else {
          this.currentInput = this.currentInput.slice(0, -1);
        }
      } else {
        this.currentInput = '0';
      }
    }
    this.updateDisplay();
  },

  clear() {
    this.currentInput = '0';
    this.updateDisplay();
  },

  allClear() {
    this.currentInput = '0';
    this.previousInput = null;
    this.operation = null;
    this.formula = '';
    this.isNewInput = false;
    this.updateDisplay();
  },

  toggleSign() {
    if (this.currentInput !== '0') {
      if (this.currentInput.startsWith('-')) {
        this.currentInput = this.currentInput.substring(1);
      } else {
        this.currentInput = '-' + this.currentInput;
      }
      this.updateDisplay();
    }
  },

  setOperation(op) {
    const currentVal = parseFloat(this.currentInput);
    if (isNaN(currentVal)) return;

    if (this.previousInput !== null && !this.isNewInput && this.operation) {
      this.calculate(false);
    } else {
      this.previousInput = currentVal;
    }

    this.operation = op;
    this.formula = `${this.formatNumber(this.previousInput)} ${this.getOpSymbol(op)}`;
    this.isNewInput = true;
    this.updateDisplay();
  },

  applyPercent() {
    const currentVal = parseFloat(this.currentInput);
    if (isNaN(currentVal)) return;

    if (this.previousInput !== null && this.operation) {
      let percentVal = (this.previousInput * currentVal) / 100;
      percentVal = Math.round(percentVal * 1e8) / 1e8;
      this.currentInput = String(percentVal);
      this.formula = `${this.formatNumber(this.previousInput)} ${this.getOpSymbol(this.operation)} ${currentVal}%`;
    } else {
      let val = currentVal / 100;
      val = Math.round(val * 1e8) / 1e8;
      this.currentInput = String(val);
      this.formula = `${this.formatNumber(currentVal)}%`;
    }
    this.isNewInput = true;
    this.updateDisplay();
  },

  calculate(isEqualsPressed = true) {
    if (this.previousInput === null || !this.operation) return;

    const prev = this.previousInput;
    const current = parseFloat(this.currentInput);
    if (isNaN(current)) return;

    let result = 0;
    const op = this.operation;

    switch (op) {
      case '+':
        result = prev + current;
        break;
      case '-':
        result = prev - current;
        break;
      case '*':
        result = prev * current;
        break;
      case '/':
        if (current === 0) {
          ProApp.showToast("Nolga bo'lish mumkin emas!", "danger");
          return;
        }
        result = prev / current;
        break;
      default:
        return;
    }

    result = Math.round(result * 1e8) / 1e8;

    const expr = `${this.formatNumber(prev)} ${this.getOpSymbol(op)} ${this.formatNumber(current)} =`;
    this.formula = expr;

    if (isEqualsPressed) {
      this.addHistory(expr, result);
      this.previousInput = null;
      this.operation = null;
    } else {
      this.previousInput = result;
    }

    this.currentInput = String(result);
    this.isNewInput = true;
    this.updateDisplay();
  },

  getOpSymbol(op) {
    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      case '/': return '÷';
      default: return op;
    }
  },

  formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const parts = String(num).split('.');
    const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.length > 1 ? `${intFormatted}.${parts[1]}` : intFormatted;
  },

  formatCurrentInput(str) {
    if (!str || str === '0') return '0';
    if (str === '-') return '-';
    const isNegative = str.startsWith('-');
    const cleanStr = isNegative ? str.slice(1) : str;
    const parts = cleanStr.split('.');
    const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (isNegative ? '-' : '') + (parts.length > 1 ? `${intFormatted}.${parts[1]}` : intFormatted);
  },

  getRawNumber() {
    return parseFloat(this.currentInput) || 0;
  },

  updateDisplay() {
    const mainEl = document.getElementById('calcDisplayMain');
    const formulaEl = document.getElementById('calcDisplayFormula');
    if (mainEl) {
      mainEl.textContent = this.formatCurrentInput(this.currentInput);
    }
    if (formulaEl) {
      formulaEl.textContent = this.formula || '\u00A0';
    }
  },

  addHistory(expr, result) {
    const time = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    this.history.unshift({
      expr,
      result: this.formatNumber(result),
      raw: result,
      time
    });
    if (this.history.length > 30) this.history.pop();
    this.saveHistory();
    if (this.showHistory) {
      this.renderHistory();
    }
  },

  renderHistory() {
    const listEl = document.getElementById('calcHistoryList');
    if (!listEl) return;

    if (this.history.length === 0) {
      listEl.innerHTML = `<div class="calc-history-empty">Hozircha hisob-kitoblar yo'q</div>`;
      return;
    }

    listEl.innerHTML = this.history.map((h, i) => `
      <div class="calc-history-item" onclick="ProCalc.loadFromHistory(${i})">
        <div class="calc-hist-expr">
          <span>${h.expr}</span>
          <span class="calc-hist-time">${h.time}</span>
        </div>
        <div class="calc-hist-result">${h.result} so'm</div>
      </div>
    `).join('');
  },

  clearHistory() {
    this.history = [];
    this.saveHistory();
    this.renderHistory();
    ProApp.showToast("Kalkulyator tarixi tozalandi", "info");
  },

  loadFromHistory(index) {
    const item = this.history[index];
    if (item) {
      this.currentInput = String(item.raw);
      this.formula = item.expr;
      this.isNewInput = true;
      this.updateDisplay();
      this.toggleHistory();
      ProApp.showToast(`Natija yuklandi: ${item.result}`, "info");
    }
  },

  copyToClipboard(showNotification = true) {
    const rawVal = this.getRawNumber();
    const formatted = this.formatCurrentInput(this.currentInput);
    const textToCopy = String(rawVal);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        if (showNotification) {
          ProApp.showToast(`Nusxalandi: ${formatted} so'm`, "success");
        }
      }).catch(() => {
        this.fallbackCopy(textToCopy, formatted, showNotification);
      });
    } else {
      this.fallbackCopy(textToCopy, formatted, showNotification);
    }
  },

  fallbackCopy(text, formatted, showNotification) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    if (showNotification) {
      ProApp.showToast(`Nusxalandi: ${formatted} so'm`, "success");
    }
  },

  insertToForm() {
    const rawVal = this.getRawNumber();
    if (isNaN(rawVal)) {
      ProApp.showToast("Joylash uchun summa topilmadi", "info");
      return;
    }

    const modalFinance = document.getElementById('modalFinance');
    const modalStore = document.getElementById('modalStore');
    let inserted = false;

    if (modalFinance && modalFinance.classList.contains('active')) {
      const input = document.getElementById('financeAmount');
      if (input) {
        input.value = Math.round(rawVal);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        inserted = true;
        ProApp.showToast(`Moliya summasiga kiritildi: ${ProApp.formatMoney(rawVal)}`, "success");
      }
    } else if (modalStore && modalStore.classList.contains('active')) {
      const input = document.getElementById('inputInitialDebt');
      if (input) {
        input.value = Math.round(rawVal);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        inserted = true;
        ProApp.showToast(`Boshlang'ich qarzga kiritildi: ${ProApp.formatMoney(rawVal)}`, "success");
      }
    }

    this.copyToClipboard(false);

    if (!inserted) {
      ProApp.showToast(`Summa xotiraga nusxalandi: ${ProApp.formatMoney(rawVal)}`, "success");
    }
  },

  bindEvents() {
    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      // Alt + C to toggle calculator
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        this.toggle();
        return;
      }

      if (!this.isOpen) return;

      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        this.close();
        return;
      }

      if (isInput) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        this.appendDigit(e.key);
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        this.appendDot();
      } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
        e.preventDefault();
        this.setOperation(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        this.calculate(true);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        this.deleteChar();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        this.clear();
      } else if (e.key === '%') {
        e.preventDefault();
        this.applyPercent();
      }
    });

    this.initDrag();
  },

  initDrag() {
    const card = document.getElementById('proCalcCard');
    const header = document.getElementById('calcDragHeader');
    if (!card || !header) return;

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      if (window.innerWidth <= 600) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = card.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      card.style.right = 'auto';
      card.style.bottom = 'auto';
      card.style.left = `${initialLeft}px`;
      card.style.top = `${initialTop}px`;
      card.classList.add('is-dragging');

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        const maxLeft = window.innerWidth - card.offsetWidth - 10;
        const maxTop = window.innerHeight - card.offsetHeight - 10;

        newLeft = Math.max(10, Math.min(newLeft, maxLeft));
        newTop = Math.max(10, Math.min(newTop, maxTop));

        card.style.left = `${newLeft}px`;
        card.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        card.classList.remove('is-dragging');
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }
};

window.ProCalc = ProCalc;

document.addEventListener('DOMContentLoaded', () => {
  ProApp.init();
  ProCalc.init();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    ProApp.switchView('table');
  }
});
