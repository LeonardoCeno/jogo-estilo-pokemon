<?php

require_once __DIR__ . '/../Personagem.php';
require_once __DIR__ . '/../ExcecaoJogo.php';

class Ulquiorra extends Personagem {

	const CUSTO_CERO = 90;
	const CUSTO_HEAL = 170;
	const DANO_CERO = 70;
	const CURA_HEAL = 100;
	const REGENERACAO_PROPRIA = 40;

	public function __construct(string $nome) {
		parent::__construct($nome, 240, 30, 400);
	}

	public static function getDescricao(): string {
		return "Ulquiorra (HP alto, ataque alto, energia média, habilidades: Cero e Heal)";
	}

	public function cero(Personagem $alvo): string {
		if ($this->energiaAtual < self::CUSTO_CERO) {
			throw new EnergiaInsuficienteException();
		}

		$this->energiaAtual -= self::CUSTO_CERO;

		if ($alvo->tentouDesviarAtaque()) {
			return "{$this->nome} usou Cero em {$alvo->getNome()}, mas {$alvo->getNome()} desviou!";
		}

		$vidaAntes = $alvo->getVidaAtual();
		$danoReal = self::DANO_CERO;
		$alvo->receberDano($danoReal);

		return $this->formatarMensagemAcaoComAlvo("Cero", $alvo, $vidaAntes, $danoReal);
	}

	public function heal(): string {
		if ($this->energiaAtual < self::CUSTO_HEAL) {
			throw new EnergiaInsuficienteException();
		}

		$this->energiaAtual -= self::CUSTO_HEAL;
		$this->vidaAtual += self::CURA_HEAL;

		if ($this->vidaAtual > $this->vidaMaxima) {
			$this->vidaAtual = $this->vidaMaxima;
		}

		return $this->formatarMensagemAcaoSemAlvo("Heal");
	}

	public function usarHabilidadeEspecial(Personagem $alvo): string {
		return $this->cero($alvo);
	}

	public function getHabilidades(): array {
		return [
			[
				"nome" => "Cero",
				"metodo" => "cero",
				"precisaAlvo" => true
			],
			[
				"nome" => "Heal",
				"metodo" => "heal",
				"precisaAlvo" => false
			]
		];
	}

	public function getDescricoesAcoes(): array {
		return array_merge(parent::getDescricoesAcoes(), [
			'Cero' => 'Causa 70 de dano fixo. Custo: ' . self::CUSTO_CERO . ' energia.',
			'Heal' => 'Recupera 100 de vida. Custo: ' . self::CUSTO_HEAL . ' energia.',
		]);
	}

	public function getConfiguracaoVisual(): array {
		return [
			'baseSprite' => './ulquiorrapasta/sprites/REALCIFERBASE.png',
			'actions' => [
                  'Ataque' => [
                    'frames' => [
                        [
                            'sprite' => './ulquiorrapasta/sprites/ciferhit1.png',
                            'durationMs' => 400,
                        ],
                        [
                            'sprite' => './ulquiorrapasta/sprites/ciferhit2.png',
                            'durationMs' => 400,
                        ],
                    ],
                ],
				'Cero' => [
					'frames' => [
						[
							'sprite' => './ulquiorrapasta/sprites/cifercero1.png',
							'durationMs' => 1000,
						],
						[
							'sprite' => './ulquiorrapasta/sprites/cifercero2TRUE.png',
							'durationMs' => 1000,
						],
					],
					'overlays' => [
						[
							'mode' => 'beam',
							'target' => 'opponent',
							'startMs' => 1000,
							'durationMs' => 650,
							'thicknessPx' => 38,
							'frontOffsetPx' => 90,
							'startOffsetX' => 0,
							'startOffsetY' => 15,
							'endOffsetX' => 0,
							'endOffsetY' => 40,
						],
					],
				],
			],
			'reactions' => [
				'defendingHit' => [
					'frames' => [
						[
							'sprite' => './ulquiorrapasta/sprites/ciferdef.png',
							'durationMs' => 1200,
						],
					],
				],
			],
		];
	}

	protected function getRegeneracaoEnergia(): int {
		return self::REGENERACAO_PROPRIA;
	}
}
