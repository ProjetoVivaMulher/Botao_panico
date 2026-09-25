/**
 * Viva Mulher - Botão de Pânico
 * Módulo de Camuflagem (Calculadora Disfarçada de Proteção)
 */

const CamouflageModule = {
  currentVal: '0',
  prevVal: '',
  operation: null,
  shouldResetDisplay: false,
  inputHistory: '',
  secretCode: '7777',

  init() {
    this.screen = document.getElementById('camouflageScreen');
    this.calcCurrent = document.getElementById('calcCurrent');
    this.calcPrev = document.getElementById('calcPrev');
    this.btnDiscreet = document.getElementById('btnDiscreetMode');

    if (!this.screen) return;

    if (this.btnDiscreet) {
      this.btnDiscreet.addEventListener('click', () => this.activate());
    }

    const buttons = this.screen.querySelectorAll('.calc-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        this.handleInput(val);
      });
    });
  },

  activate() {
    if (this.screen) {
      this.screen.classList.add('active');
      this.clear();
      this.inputHistory = '';
    }
  },

  deactivate() {
    if (this.screen) {
      this.screen.classList.remove('active');
      this.clear();
      this.inputHistory = '';
      if (window.AppController && window.AppController.showToast) {
        window.AppController.showToast('Modo de Segurança Viva Mulher Ativado');
      }
    }
  },

  handleInput(val) {
    if (!val) return;

    // Verificar código secreto de desmascaramento
    if (val >= '0' && val <= '9') {
      this.inputHistory += val;
      if (this.inputHistory.endsWith(this.secretCode)) {
        this.deactivate();
        return;
      }
    }

    if (val >= '0' && val <= '9') {
      this.appendNumber(val);
    } else if (val === '.') {
      this.appendDecimal();
    } else if (val === 'C') {
      this.clear();
    } else if (val === '±') {
      this.toggleSign();
    } else if (val === '%') {
      this.percent();
    } else if (['+', '-', '×', '÷'].includes(val)) {
      this.chooseOperation(val);
    } else if (val === '=') {
      this.compute();
    }

    this.updateDisplay();
  },

  appendNumber(number) {
    if (this.currentVal === '0' || this.shouldResetDisplay) {
      this.currentVal = number;
      this.shouldResetDisplay = false;
    } else {
      if (this.currentVal.length < 12) {
        this.currentVal += number;
      }
    }
  },

  appendDecimal() {
    if (this.shouldResetDisplay) {
      this.currentVal = '0.';
      this.shouldResetDisplay = false;
      return;
    }
    if (!this.currentVal.includes('.')) {
      this.currentVal += '.';
    }
  },

  clear() {
    this.currentVal = '0';
    this.prevVal = '';
    this.operation = null;
    this.shouldResetDisplay = false;
    this.updateDisplay();
  },

  toggleSign() {
    if (this.currentVal !== '0') {
      if (this.currentVal.startsWith('-')) {
        this.currentVal = this.currentVal.slice(1);
      } else {
        this.currentVal = '-' + this.currentVal;
      }
    }
  },

  percent() {
    const current = parseFloat(this.currentVal);
    if (!isNaN(current)) {
      this.currentVal = (current / 100).toString();
    }
  },

  chooseOperation(op) {
    if (this.currentVal === '') return;
    if (this.prevVal !== '') {
      this.compute();
    }
    this.operation = op;
    this.prevVal = this.currentVal;
    this.shouldResetDisplay = true;
  },

  compute() {
    let result;
    const prev = parseFloat(this.prevVal);
    const current = parseFloat(this.currentVal);

    if (isNaN(prev) || isNaN(current) || !this.operation) return;

    switch (this.operation) {
      case '+':
        result = prev + current;
        break;
      case '-':
        result = prev - current;
        break;
      case '×':
        result = prev * current;
        break;
      case '÷':
        result = current === 0 ? 'Erro' : prev / current;
        break;
      default:
        return;
    }

    this.currentVal = typeof result === 'number' ? Math.round(result * 1000000) / 1000000 : result;
    this.currentVal = String(this.currentVal);
    this.operation = null;
    this.prevVal = '';
    this.shouldResetDisplay = true;
  },

  updateDisplay() {
    if (this.calcCurrent) {
      this.calcCurrent.textContent = this.currentVal || '0';
    }
    if (this.calcPrev) {
      if (this.operation != null) {
        this.calcPrev.textContent = `${this.prevVal} ${this.operation}`;
      } else {
        this.calcPrev.textContent = '';
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  CamouflageModule.init();
});

window.CamouflageModule = CamouflageModule;
