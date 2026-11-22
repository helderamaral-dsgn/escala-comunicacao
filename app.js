(function () {
  'use strict';
  var E = window.ESCALA;
  var SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  var SEMANA_MES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  var SEMANA_LONGA =['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var $ = function (id) { return document.getElementById(id); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };

  var hoje = new Date();
  var hojeChave = hoje.getFullYear() + '-' + pad(hoje.getMonth() + 1) + '-' + pad(hoje.getDate());

  var guardar = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var ler = function (k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };

  // mês inicial: o mês atual, senão o próximo, senão o último
  var idx = E.meses.length - 1;
  for (var i = 0; i < E.meses.length; i++) {
    var m = E.meses[i];
    if (m.ano * 12 + m.mes >= hoje.getFullYear() * 12 + hoje.getMonth() + 1) { idx = i; break; }
  }
  var nome = ler('escala-nome');

  // lista de pessoas (nome completo + foto vêm de E.pessoas)
  var P = E.pessoas || {};
  var nomeCompleto = function (k) { return (P[k] && P[k].nome) || k; };
  var pessoas = {};
  Object.keys(P).forEach(function (k) { if (P[k].sempre) pessoas[k] = 1; });
  E.meses.forEach(function (m) {
    Object.keys(m.dias).forEach(function (d) {
      m.dias[d].turnos.forEach(function (t) { if (t.pessoa) pessoas[t.nome] = 1; });
    });
  });
  var sel = $('sel-nome');
  Object.keys(pessoas).sort(function (a, b) { return nomeCompleto(a).localeCompare(nomeCompleto(b), 'pt'); }).forEach(function (p) {
    var o = document.createElement('option'); o.value = p; o.textContent = nomeCompleto(p); sel.appendChild(o);
  });
  function avatar(k) {
    var p = P[k];
    if (p && p.foto) return '<img class="av" src="' + esc(p.foto) + '" alt="" loading="lazy">';
    var ini = nomeCompleto(k).replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(function (s) { return s[0]; }).join('').toUpperCase();
    return '<span class="av ini">' + esc(ini) + '</span>';
  }
  if (nome && !pessoas[nome]) nome = '';
  sel.value = nome;
  sel.addEventListener('change', function () { nome = sel.value; guardar('escala-nome', nome); render(true); });

  function chaveDe(m, d) { return m.ano + '-' + pad(m.mes) + '-' + pad(d); }
  function temNome(dia) { return !nome || dia.turnos.some(function (t) { return t.nome === nome; }); }

  function abas() {
    $('abas').innerHTML = E.meses.map(function (m, i) {
      return '<button type="button" class="aba' + (i === idx ? ' ativa' : '') + '" data-i="' + i + '">' + m.nomeMes + '</button>';
    }).join('');
    Array.prototype.forEach.call($('abas').children, function (b) {
      b.addEventListener('click', function () { idx = +b.dataset.i; render(true); });
    });
  }

  function proximo() {
    // próximo dia com escala (de hoje em diante), considerando o filtro de nome
    var achado = null;
    for (var i = 0; i < E.meses.length && !achado; i++) {
      var m = E.meses[i];
      var dias = Object.keys(m.dias).map(Number).sort(function (a, b) { return a - b; });
      for (var j = 0; j < dias.length; j++) {
        var dia = m.dias[dias[j]];
        if (chaveDe(m, dias[j]) >= hojeChave && temNome(dia) && dia.turnos.some(function (t) { return t.pessoa; })) { achado = { m: m, d: dias[j], dia: dia }; break; }
      }
    }
    var el = $('proximo');
    if (!achado) { el.innerHTML = '<div class="prox-card"><span class="prox-rot">Próximo serviço</span><p class="prox-vazio">Nenhum serviço pela frente nesta escala.</p></div>'; return; }
    var dt = new Date(achado.m.ano, achado.m.mes - 1, achado.d);
    var quando = chaveDe(achado.m, achado.d) === hojeChave ? 'Hoje' : SEMANA_LONGA[dt.getDay()] + ', ' + pad(achado.d) + '/' + pad(achado.m.mes);
    var turnos = achado.dia.turnos.filter(function (t) { return t.pessoa && (!nome || t.nome === nome); });
    el.innerHTML = '<div class="prox-card"><span class="prox-rot">' + (nome ? 'Seu próximo serviço' : 'Próximo serviço') + '</span>' +
      '<p class="prox-quando">' + quando + (achado.dia.evento ? ' <span class="prox-ev">★ ' + esc(achado.dia.evento) + '</span>' : '') + '</p>' +
      '<div class="pills">' + turnos.map(pill).join('') + '</div></div>';
    ligarPills(el);
  }

  function pill(t) {
    var aberto = t.nome === 'A DEFINIR';
    var nomeHtml = t.rotuloFixo ? '' : aberto ? '<b>A definir</b>' : avatar(t.nome) + '<b>' + esc(nomeCompleto(t.nome)) + '</b>';
    var classe = 'pill ' + t.cor + (aberto ? ' aberto' : '') + (nome && t.nome === nome ? ' eu' : '') + (t.arquivo ? ' clicavel' : '');
    var dados = t.arquivo ? ' data-t="' + esc(JSON.stringify(t)) + '"' : '';
    var tag = t.arquivo ? 'button type="button"' : 'span';
    return '<' + tag + ' class="' + classe + '"' + dados + '><span class="tag"><span class="tl">' + esc(t.rotulo) + '</span><span class="tc">' + esc(t.rotulo.split(' · ').pop()) + '</span></span>' + nomeHtml +
      (t.arquivo ? '<span class="add" aria-hidden="true">＋</span>' : '') + '</' + tag.split(' ')[0] + '>';
  }

  function mini(m) {
    var primeiro = new Date(m.ano, m.mes - 1, 1).getDay();
    var ultimo = new Date(m.ano, m.mes, 0).getDate();
    var semanas = Math.ceil((primeiro + ultimo) / 7);
    var h = SEMANA.map(function (d, i) { return '<div class="mc-cab' + (i === 0 ? ' dom' : '') + '">' + d + '</div>'; }).join('');
    for (var i = 0; i < semanas * 7; i++) {
      var dt = new Date(m.ano, m.mes - 1, 1 - primeiro + i);
      var doMes = dt.getMonth() === m.mes - 1, d = dt.getDate(), wd = dt.getDay();
      var dia = doMes ? m.dias[d] : null;
      var cls = 'mc-cel' + (doMes ? '' : ' fora') + (wd === 0 ? ' dom' : '') + (wd === 4 ? ' qui' : '');
      if (doMes && chaveDe(m, d) < hojeChave) cls += ' passado';
      if (doMes && chaveDe(m, d) === hojeChave) cls += ' hoje';
      if (dia && nome) cls += temNome(dia) ? ' meu' : ' apagado';
      var chips = dia ? dia.turnos.map(function (t) {
        return '<span class="mc-chip ' + t.cor + (t.nome === 'A DEFINIR' ? ' aberto' : '') + (nome && t.nome === nome ? ' eu' : '') + '">' +
          (t.rotuloFixo ? 'CORTES' : esc(t.nome === 'A DEFINIR' ? '?' : t.nome)) + '</span>';
      }).join('') : '';
      h += '<' + (dia ? 'a href="#d' + d + '"' : 'div') + ' class="' + cls + '"><span class="mc-num">' + pad(d) + '</span>' +
        (dia && dia.evento ? '<span class="mc-ev">★</span>' : '') + '<div class="mc-chips">' + chips + '</div></' + (dia ? 'a' : 'div') + '>';
    }
    $('mini').innerHTML = h;
  }

  function lista(m) {
    var dias = Object.keys(m.dias).map(Number).sort(function (a, b) { return a - b; });
    var h = '', semAnt = null, primeiro = new Date(m.ano, m.mes - 1, 1).getDay(), visiveis = 0;
    dias.forEach(function (d) {
      var dia = m.dias[d];
      if (!temNome(dia)) return;
      visiveis++;
      var wd = new Date(m.ano, m.mes - 1, d).getDay();
      var sem = Math.floor((d + primeiro - 1) / 7);
      if (semAnt !== null && sem !== semAnt && !nome) h += '<div class="sep"></div>';
      semAnt = sem;
      var cls = 'linha anima' + (wd === 0 ? ' dom' : '') + (wd === 4 ? ' qui' : '') + (chaveDe(m, d) < hojeChave ? ' passado' : '') + (chaveDe(m, d) === hojeChave ? ' hoje' : '');
      h += '<div class="' + cls + '" id="d' + d + '"><div class="data"><span class="dn">' + pad(d) + '</span><span class="ds">' + SEMANA[wd] + '</span></div>' +
        '<div class="itens">' + (dia.evento ? '<div class="ev">★ ' + esc(dia.evento) + '</div>' : '') +
        '<div class="pills">' + dia.turnos.map(pill).join('') + '</div></div></div>';
    });
    $('lista').innerHTML = h || '<p class="vazio">Você não está escalado(a) neste mês.</p>';
    var meus = 0;
    if (nome) E.meses[idx] && Object.keys(m.dias).forEach(function (d) { m.dias[d].turnos.forEach(function (t) { if (t.nome === nome) meus++; }); });
    $('resumo').textContent = nome ? (meus ? nomeCompleto(nome).split(' ')[0] + ', você serve ' + meus + (meus === 1 ? ' vez' : ' vezes') + ' em ' + m.nomeMes.toLowerCase() + '. 💚' : '') : '';
    ligarPills($('lista'));
    progresso(m);
  }

  // progresso do mês: serviços já realizados / total (ou só os da pessoa escolhida)
  function progresso(m) {
    var total = 0, feitos = 0;
    Object.keys(m.dias).forEach(function (d) {
      var passou = chaveDe(m, +d) < hojeChave;
      m.dias[d].turnos.forEach(function (t) {
        if (nome && t.nome !== nome) return;
        total++; if (passou) feitos++;
      });
    });
    var pct = total ? Math.round(feitos / total * 100) : 0;
    $('progresso').innerHTML = total ? '<span class="bolha" title="' + pct + '% do mês concluído">' + pct + '%</span>' : '';
    $('prog-txt').textContent = total ? (nome ? 'Seus serviços concluídos' : 'Mês concluído') + ' · ' + feitos + ' de ' + total : '';
    $('prog-pct').textContent = total ? pct + '%' : '';
    $('prog-resumo').hidden = !total;
    // a barra lateral enche até a primeira data que ainda não aconteceu
    var wrap = $('lista-wrap'), linhas = wrap.querySelectorAll('.linha'), alvo = 0;
    if (linhas.length) {
      var futura = Array.prototype.find.call(linhas, function (l) { return !l.classList.contains('passado'); });
      alvo = futura ? futura.offsetTop - 6 : wrap.offsetHeight;
      if (futura && futura === linhas[0]) alvo = 0;
    }
    var fill = $('trilho-fill'), barra = $('prog-barra-fill');
    fill.style.height = '0px'; barra.style.width = '0%';
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      fill.style.height = Math.max(0, alvo) + 'px'; barra.style.width = pct + '%';
    }); });
  }

  function dataBonita(texto) {
    var p = texto.split(' - '), d = p[0].split('.');
    var rest = p.slice(1).join(' - ').toLowerCase().replace(/(^|\s)(\S)/g, function (a, s, c) { return s + c.toUpperCase(); })
      .replace(/\b(Do|Da|De|Dos|Das|No|Na|E)\b/g, function (w) { return w.toLowerCase(); });
    return { dia: d[0], mes: d[1], texto: rest };
  }

  function render(animar) {
    var m = E.meses[idx];
    $('titulo-mes').textContent = m.nomeMes;
    $('titulo-ano').textContent = m.ano;
    abas(); proximo(); mini(m); lista(m);
    $('datas').innerHTML = m.rodape.map(function (r) {
      var b = dataBonita(r.texto);
      var tipo = r.destaque ? 'Evento' : (/anivers/i.test(r.texto) ? 'Aniversário' : 'Data');
      return '<li class="' + (r.destaque ? 'dest' : '') + '"><span class="dt"><b>' + esc(b.dia) + '</b><small>' + esc(SEMANA_MES[+b.mes - 1]) + '</small></span>' +
        '<span class="dtx"><small>' + (r.destaque ? '★ ' : '') + tipo + '</small>' + esc(b.texto.replace(/^Aniversário\s+/i, '')) + '</span></li>';
    }).join('');
    var pdf = $('btn-pdf'); pdf.href = m.pdf; $('btn-pdf-txt').textContent = 'Baixar PDF de ' + m.nomeMes.toLowerCase();
    if (animar) { var mes = $('mes'); mes.classList.remove('troca'); void mes.offsetWidth; mes.classList.add('troca'); }
    observar();
  }

  // animação de entrada ao rolar
  var obs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visivel'); obs.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function observar() {
    var els = document.querySelectorAll('.anima:not(.visivel)');
    Array.prototype.forEach.call(els, function (el, i) {
      el.style.transitionDelay = Math.min(i, 8) * 40 + 'ms';
      if (obs) obs.observe(el); else el.classList.add('visivel');
    });
  }

  // folha "adicionar à agenda"
  function ligarPills(raiz) {
    Array.prototype.forEach.call(raiz.querySelectorAll('.pill.clicavel'), function (b) {
      b.addEventListener('click', function () { abrir(JSON.parse(b.dataset.t)); });
    });
  }
  function abrir(t) {
    var p = t.chave.split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2]);
    $('sheet-quando').textContent = SEMANA_LONGA[dt.getDay()] + ', ' + p[2] + '/' + p[1] + (t.hora ? ' · ' + t.hora.replace(':', 'h') : '');
    $('sheet-titulo').textContent = t.titulo;
    $('sheet-nome').textContent = nomeCompleto(t.nome);
    $('sheet-ics').href = 'agenda/' + t.arquivo;
    $('sheet-google').href = t.google;
    $('fundo-sheet').hidden = false; $('sheet').hidden = false;
    requestAnimationFrame(function () { document.body.classList.add('sheet-aberta'); });
  }
  function fechar() {
    document.body.classList.remove('sheet-aberta');
    setTimeout(function () { $('fundo-sheet').hidden = true; $('sheet').hidden = true; }, 250);
  }
  $('sheet-fechar').addEventListener('click', fechar);
  $('fundo-sheet').addEventListener('click', fechar);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });

  render(false);
  document.body.classList.add('pronto');
  var tm; window.addEventListener('resize', function () { clearTimeout(tm); tm = setTimeout(function () { progresso(E.meses[idx]); }, 200); });
})();
