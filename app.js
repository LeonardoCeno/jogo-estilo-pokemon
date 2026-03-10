(function () {
	const API_URL = "./web_api.php";
	const ACTION_DELAY_MS = 2000;
	const ACOES_POR_PAGINA = 3;
	const PLACEHOLDER_ACTIONS_HTML = `
		<button disabled>ATACAR</button>
		<button disabled>DEFENDER</button>
		<button class="pagination-btn" disabled>→</button>
		<button disabled>HABILIDADE</button>
	`;

	const state = {
		serverState: null,
		resolvendoAcao: false,
		actionPage: 0,
		domainPreviewActive: false,
		spriteTemporario: {
			player1: null,
			player2: null,
		},
	};

	const els = {
		turnInfo: document.getElementById("turn-info"),
		log: document.getElementById("battle-log"),
		menu: document.getElementById("action-menu"),
		arena: document.querySelector(".arena"),
		setupPanel: document.getElementById("setup-panel"),
		battleView: document.getElementById("battle-view"),
		startBtn: document.getElementById("start-btn"),
		p1Name: document.getElementById("p1-name"),
		p2Name: document.getElementById("p2-name"),
		p1Class: document.getElementById("p1-class"),
		p2Class: document.getElementById("p2-class"),
		winnerOverlay: document.getElementById("winner-overlay"),
		winnerSprite: document.getElementById("winner-sprite"),
		winnerText: document.getElementById("winner-text"),
		playAgainBtn: document.getElementById("play-again-btn"),
		cards: {
			enemy: {
				name: document.getElementById("enemy-name"),
				tag: document.getElementById("enemy-tag"),
				hpText: document.getElementById("enemy-hp-text"),
				energyText: document.getElementById("enemy-energy-text"),
				hpBar: document.getElementById("enemy-hp-bar"),
				energyBar: document.getElementById("enemy-energy-bar"),
			},
			player: {
				name: document.getElementById("player-name"),
				tag: document.getElementById("player-tag"),
				hpText: document.getElementById("player-hp-text"),
				energyText: document.getElementById("player-energy-text"),
				hpBar: document.getElementById("player-hp-bar"),
				energyBar: document.getElementById("player-energy-bar"),
			},
		},
		fighters: {
			p1: document.getElementById("fighter-player"),
			p2: document.getElementById("fighter-enemy"),
		},
	};

	async function chamarApi(action, payload = {}) {
		const response = await fetch(API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action, ...payload }),
		});

		if (!response.ok) {
			let mensagemErro = `Falha na API (${response.status}).`;
			try {
				const corpoErro = await response.json();
				if (corpoErro && corpoErro.message) {
					mensagemErro = corpoErro.message;
				}
			} catch (_) {}
			throw new Error(mensagemErro);
		}

		return response.json();
	}

	function percentual(atual, maximo) {
		if (maximo <= 0) return "0%";
		return `${Math.max(0, Math.min(100, (atual / maximo) * 100))}%`;
	}

	function classePerigosa(hpAtual, hpMax) {
		return hpMax > 0 && hpAtual / hpMax <= 0.3;
	}

	function adicionarLog(texto) {
		const li = document.createElement("li");
		li.textContent = texto;
		els.log.prepend(li);

		while (els.log.children.length > 8) {
			els.log.removeChild(els.log.lastChild);
		}
	}

	function limparSpritesTemporarios() {
		state.spriteTemporario.player1 = null;
		state.spriteTemporario.player2 = null;
	}

	function aplicarVisualPersonagem(personagem, fighterEl, spriteTemporario = null) {
		const nomeClasse = personagem?.classe || "";
		const spriteBase = personagem?.visual?.baseSprite || null;
		const img = fighterEl.querySelector(".fighter-img");
		const initial = fighterEl.querySelector("span");

		fighterEl.classList.remove("has-image", "is-flipped");
		fighterEl.classList.remove("action-casting");
		img.removeAttribute("src");

		if (spriteTemporario) {
			img.src = spriteTemporario;
			fighterEl.classList.add("has-image", "action-casting");

			if (fighterEl.dataset.side === "player2") {
				fighterEl.classList.add("is-flipped");
			}

			img.onerror = () => fighterEl.classList.remove("has-image", "is-flipped", "action-casting");
			if (initial) {
				initial.textContent = (nomeClasse || "?").trim().charAt(0).toUpperCase() || "?";
			}
			return;
		}

		if (spriteBase) {
			img.src = spriteBase;
			fighterEl.classList.add("has-image");

			if (fighterEl.dataset.side === "player2") {
				fighterEl.classList.add("is-flipped");
			}
		}

		img.onerror = () => fighterEl.classList.remove("has-image", "is-flipped");
		if (initial) {
			initial.textContent = (personagem?.classeNome || "?").trim().charAt(0).toUpperCase() || "?";
		}
	}

	function atualizarCardStatus(personagem, refs) {
		refs.name.textContent = personagem.classeNome.toUpperCase();
		refs.tag.textContent = personagem.nome;
		refs.hpText.textContent = `${personagem.vidaAtual} / ${personagem.vidaMaxima}`;
		refs.energyText.textContent = `${personagem.energiaAtual} / ${personagem.energiaMaxima}`;
		refs.hpBar.style.width = percentual(personagem.vidaAtual, personagem.vidaMaxima);
		refs.energyBar.style.width = percentual(personagem.energiaAtual, personagem.energiaMaxima);
		refs.hpBar.classList.toggle("danger", classePerigosa(personagem.vidaAtual, personagem.vidaMaxima));
	}

	function mostrarTelaVitoria(server) {
		if (!server || !server.winner) {
			els.winnerOverlay.classList.add("hidden");
			return;
		}

		const vencedor = server.winner === "p1" ? server.p1 : server.p2;
		const labelVencedor = server.winner === "p1" ? "Jogador 1" : "Jogador 2";
		const spriteBase = vencedor?.visual?.baseSprite || "";

		els.winnerText.textContent = `${labelVencedor} (${vencedor.nome}) venceu!`;

		if (spriteBase) {
			els.winnerSprite.src = spriteBase;
			els.winnerSprite.style.display = "block";
		} else {
			els.winnerSprite.removeAttribute("src");
			els.winnerSprite.style.display = "none";
		}

		els.winnerOverlay.classList.remove("hidden");
	}

	function atualizarHUD() {
		const server = state.serverState;
		if (!server || !server.started) {
			els.arena.classList.remove("domain-active");
			els.winnerOverlay.classList.add("hidden");
			return;
		}

		const dominioAtivo = state.domainPreviewActive || (server.domainTurnsRemaining || 0) > 0;
		els.arena.classList.toggle("domain-active", dominioAtivo);

		atualizarCardStatus(server.p2, els.cards.enemy);
		atualizarCardStatus(server.p1, els.cards.player);

		aplicarVisualPersonagem(server.p2, els.fighters.p2, state.spriteTemporario.player2);
		aplicarVisualPersonagem(server.p1, els.fighters.p1, state.spriteTemporario.player1);

		if (server.winner) {
			els.turnInfo.textContent = `${server.winner === "p1" ? "Jogador 1" : "Jogador 2"} venceu!`;
			mostrarTelaVitoria(server);
			return;
		}

		els.winnerOverlay.classList.add("hidden");

		const jogadorDaVez = server.currentKey === "p1" ? "Jogador 1" : "Jogador 2";
		const nomeDaVez = server.currentKey === "p1" ? server.p1.nome : server.p2.nome;
		els.turnInfo.textContent = `Turno ${server.turno} • ${jogadorDaVez} (${nomeDaVez})`;
	}

	function obterChaveLado(chaveJogador) {
		return chaveJogador === "p1" ? "player1" : "player2";
	}

	function obterFramesAnimacao(chaveJogador, caminho, nome) {
		const server = state.serverState;
		if (!server || !server[chaveJogador]) {
			return [];
		}

		const raiz = caminho === "actions"
			? server[chaveJogador].visual?.actions || {}
			: server[chaveJogador].visual?.reactions || {};

		const alvo = raiz[nome];
		const frames = Array.isArray(alvo?.frames) ? alvo.frames : [];

		return frames
			.filter((frame) => frame && typeof frame.sprite === "string" && frame.sprite.trim() !== "")
			.map((frame) => ({
				sprite: frame.sprite,
				durationMs: Number(frame.durationMs) > 0 ? Number(frame.durationMs) : 0,
			}));
	}

	function obterFramesAnimacaoAcao(chaveJogador, nomeAcao) {
		return obterFramesAnimacao(chaveJogador, "actions", nomeAcao);
	}

	function obterFramesReacaoDefesa(chaveJogador) {
		return obterFramesAnimacao(chaveJogador, "reactions", "defendingHit");
	}

	function executarAnimacaoFrames(lado, frames, duracaoPadrao = ACTION_DELAY_MS) {
		if (!frames.length) {
			return duracaoPadrao;
		}

		let acumulado = 0;
		frames.forEach((frame) => {
			const inicioFrame = acumulado;
			setTimeout(() => {
				state.spriteTemporario[lado] = frame.sprite;
				atualizarHUD();
			}, inicioFrame);
			acumulado += frame.durationMs;
		});

		return acumulado > 0 ? acumulado : ACTION_DELAY_MS;
	}

	function setBotoesAcaoHabilitados(habilitado) {
		Array.from(els.menu.querySelectorAll("button")).forEach((btn) => {
			if (btn.classList.contains("pagination-btn")) {
				const totalAcoes = (state.serverState?.availableActions || []).length;
				const totalPaginas = Math.max(1, Math.ceil(totalAcoes / ACOES_POR_PAGINA));
				btn.disabled = !habilitado || totalPaginas <= 1;
				return;
			}

			if (btn.textContent.trim() !== "-") {
				btn.disabled = !habilitado;
			}
		});
	}

	function montarAcoes() {
		els.menu.innerHTML = "";
		const server = state.serverState;

		if (!server || !server.started || server.winner) {
			return;
		}

		const acoes = (server.availableActions || []).map((acao) => ({
			...acao,
			nome: acao.label,
			nomeSprite: acao.skillName || acao.label,
		}));

		const totalPaginas = Math.max(1, Math.ceil(acoes.length / ACOES_POR_PAGINA));
		if (state.actionPage >= totalPaginas) {
			state.actionPage = 0;
		}

		const inicio = state.actionPage * ACOES_POR_PAGINA;
		const acoesPagina = acoes.slice(inicio, inicio + ACOES_POR_PAGINA);
		while (acoesPagina.length < ACOES_POR_PAGINA) {
			acoesPagina.push({ nome: "-", type: null });
		}

		const slots = [acoesPagina[0], acoesPagina[1], null, acoesPagina[2]];
		slots.forEach((acao, slotIndex) => {
			const btn = document.createElement("button");

			if (slotIndex === 2) {
				btn.textContent = "→";
				btn.classList.add("pagination-btn");
				if (totalPaginas <= 1 || state.resolvendoAcao) {
					btn.disabled = true;
				} else {
					btn.addEventListener("click", () => {
						state.actionPage = (state.actionPage + 1) % totalPaginas;
						montarAcoes();
					});
				}
				els.menu.appendChild(btn);
				return;
			}

			btn.textContent = acao.nome;
			if (!acao.type) {
				btn.disabled = true;
			} else {
				btn.addEventListener("click", () => processarAcaoComAnimacao(acao));
			}

			els.menu.appendChild(btn);
		});
	}

	function obterElementoFighter(chaveJogador) {
		return els.fighters[chaveJogador] || null;
	}

	function animarEsquiva(chaveJogador) {
		const fighter = obterElementoFighter(chaveJogador);
		if (!fighter) return;

		fighter.classList.remove("dodge-anim");
		void fighter.offsetWidth;
		fighter.classList.add("dodge-anim");

		setTimeout(() => {
			fighter.classList.remove("dodge-anim");
		}, 1200);
	}

	async function processarAcaoComAnimacao(acao) {
		if (state.resolvendoAcao || !state.serverState || !state.serverState.started || state.serverState.winner) {
			return;
		}

		const atacanteKey = state.serverState.currentKey;
		const defensorKey = atacanteKey === "p1" ? "p2" : "p1";
		const ladoAtacante = obterChaveLado(atacanteKey);
		const ladoDefensor = obterChaveLado(defensorKey);
		const nomeAcao = acao.nomeSprite || acao.nome;
		const ehInfinityVoid = nomeAcao === "Infinity Void";
		const framesAnimacao = obterFramesAnimacaoAcao(atacanteKey, nomeAcao);
		const defensorEstaDefendendo = state.serverState[defensorKey]?.defendendo === true;
		const framesReacaoDefesa = acao.targetsOpponent && defensorEstaDefendendo
			? obterFramesReacaoDefesa(defensorKey)
			: [];

		state.resolvendoAcao = true;
		setBotoesAcaoHabilitados(false);

		if (ehInfinityVoid) {
			state.domainPreviewActive = true;
			atualizarHUD();
		}

		const duracaoAtaque = executarAnimacaoFrames(ladoAtacante, framesAnimacao, ACTION_DELAY_MS);
		const duracaoDefesa = executarAnimacaoFrames(ladoDefensor, framesReacaoDefesa, 0);
		const tempoResolucao = Math.max(duracaoAtaque, duracaoDefesa);

		setTimeout(async () => {
			try {
				const resposta = await chamarApi("action", {
					actionType: acao.type,
					skillIndex: typeof acao.skillIndex === "number" ? acao.skillIndex : null,
				});

				limparSpritesTemporarios();
				if (resposta.state) {
					state.serverState = resposta.state;
				}

				state.domainPreviewActive = false;
				const mensagem = resposta.message || "Ação executada.";
				adicionarLog(mensagem);
				atualizarHUD();

				if (mensagem.includes("desviou!") && (acao.type === "attack" || acao.type === "skill")) {
					animarEsquiva(atacanteKey === "p1" ? "p2" : "p1");
				}
			} catch (erro) {
				limparSpritesTemporarios();
				state.domainPreviewActive = false;
				atualizarHUD();
				adicionarLog(`Erro ao executar ação: ${erro.message || "falha desconhecida."}`);
			} finally {
				state.resolvendoAcao = false;
				state.actionPage = 0;
				montarAcoes();
				setBotoesAcaoHabilitados(true);
			}
		}, tempoResolucao);
	}

	function resetarParaSetup() {
		state.serverState = null;
		state.resolvendoAcao = false;
		state.actionPage = 0;
		state.domainPreviewActive = false;
		limparSpritesTemporarios();

		els.battleView.classList.add("hidden");
		els.setupPanel.classList.remove("hidden");
		els.winnerOverlay.classList.add("hidden");
		els.arena.classList.remove("domain-active");

		els.turnInfo.textContent = "Prepare a partida";
		els.log.innerHTML = "";
		adicionarLog("Configure os jogadores e clique em INICIAR BATALHA.");
		els.menu.innerHTML = PLACEHOLDER_ACTIONS_HTML;
	}

	async function iniciar() {
		if (window.location.protocol === "file:") {
			adicionarLog("Abra pelo servidor PHP: http://127.0.0.1:8080/batalha.html");
			return;
		}

		els.startBtn.disabled = true;
		try {
			const resposta = await chamarApi("start", {
				p1Name: els.p1Name.value.trim() || "Jogador 1",
				p1Class: els.p1Class.value,
				p2Name: els.p2Name.value.trim() || "Jogador 2",
				p2Class: els.p2Class.value,
			});

			if (!resposta.ok) {
				adicionarLog(resposta.message || "Não foi possível iniciar a partida.");
				return;
			}

			state.serverState = resposta.state;
			state.resolvendoAcao = false;
			state.actionPage = 0;
			state.domainPreviewActive = false;
			limparSpritesTemporarios();

			els.setupPanel.classList.add("hidden");
			els.battleView.classList.remove("hidden");

			els.log.innerHTML = "";
			adicionarLog(`Partida iniciada: ${state.serverState.p1.classeNome} vs ${state.serverState.p2.classeNome}.`);
			atualizarHUD();
			montarAcoes();
		} catch (erro) {
			adicionarLog(`Erro ao iniciar: ${erro.message || "falha de conexão com a API."}`);
			adicionarLog("Confirme se o servidor está rodando em http://127.0.0.1:8080");
		} finally {
			els.startBtn.disabled = false;
		}
	}

	els.startBtn.addEventListener("click", iniciar);
	els.playAgainBtn.addEventListener("click", resetarParaSetup);
	adicionarLog("Configure os jogadores e clique em INICIAR BATALHA.");
})();
