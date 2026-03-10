<?php

require_once __DIR__ . '/../Personagem.php';
require_once __DIR__ . '/../ExcecaoJogo.php';

class Sans extends Personagem {

    const CUSTO_BLASTER = 50;
    const CUSTO_PAREDE_OSSOS = 40;
    const REGENERACAO_PROPRIA = 0;

    public function __construct(string $nome) {
        parent::__construct($nome, 1, 30, 1, 200);
    }

    public static function getDescricao(): string {

        return "Sans (HP baixíssimo, ataque alto, defesa baixa, passiva: esquiva usando energia, habilidades: Blaster e Parede de Ossos)";
    }

    public function receberDano(int $danoReal): void {
        $tipoDano = $this->consumirTipoDanoRecebido();

        if ($danoReal <= 0) {
            return;
        }

        if ($this->energiaAtual > 0) {
            $this->energiaAtual -= $danoReal;

            if ($this->energiaAtual < 0) {
                $this->energiaAtual = 0;
            }

            return;
        }

        $this->registrarTipoDanoRecebido($tipoDano);

        $this->vidaAtual -= $danoReal;

        if ($this->vidaAtual < 0) {
            $this->vidaAtual = 0;
        }
    }

    public function blaster(Personagem $alvo): string {

        if ($this->energiaAtual < self::CUSTO_BLASTER) {
            throw new EnergiaInsuficienteException();
        }

        $this->energiaAtual -= self::CUSTO_BLASTER;
        $vidaAntes = $alvo->getVidaAtual();

        $danoBase = max(0, $this->ataque - $alvo->getDefesaTotal());

        $danoReal = $danoBase * 3;

        $alvo->receberDano($danoReal);

        return $this->formatarMensagemAcaoComAlvo("Blaster", $alvo, $vidaAntes, $danoReal);
    }

    public function paredeDeOssos(Personagem $alvo): string {

        if ($this->energiaAtual < self::CUSTO_PAREDE_OSSOS) {
            throw new EnergiaInsuficienteException();
        }

        $this->energiaAtual -= self::CUSTO_PAREDE_OSSOS;
        $vidaAntes = $alvo->getVidaAtual();

        $danoBase = max(0, $this->ataque - $alvo->getDefesaTotal());

        $danoReal = $danoBase * 2;

        $alvo->receberDano($danoReal);

        return $this->formatarMensagemAcaoComAlvo("Parede de Ossos", $alvo, $vidaAntes, $danoReal);
    }

    public function usarHabilidadeEspecial(Personagem $alvo): string {
        return $this->blaster($alvo);
    }

    public function getHabilidades(): array {

        return [
            [
                "nome" => "Blaster",
                "metodo" => "blaster",
                "precisaAlvo" => true
            ],
            [
                "nome" => "Parede de Ossos",
                "metodo" => "paredeDeOssos",
                "precisaAlvo" => true
            ]
        ];
    }

    public function getDescricoesAcoes(): array {
        return array_merge(parent::getDescricoesAcoes(), [
            'Blaster' => "Causa 3x o dano base após defesa: (ataque {$this->ataque} - defesa do alvo) x 3. Custo: " . self::CUSTO_BLASTER . ' energia.',
            'Parede de Ossos' => "Causa 2x o dano base após defesa: (ataque {$this->ataque} - defesa do alvo) x 2. Custo: " . self::CUSTO_PAREDE_OSSOS . ' energia.',
        ]);
    }

    public function getConfiguracaoVisual(): array {
        return [
            'baseSprite' => './sanspasta/SANSBASEFINAL.png',
            'actions' => [
                'Parede de Ossos' => [
                    'frames' => [
                        [
                            'sprite' => './sanspasta/SANSSKILL1FINAL.png',
                            'durationMs' => 2000,
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