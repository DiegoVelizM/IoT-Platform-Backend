import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { resolveKafkaConfig } from './kafka.config';
import { KAFKA_TOPICS } from './kafka-topics.constants';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
    /**
     * Logger de NestJS para registrar eventos del consumer.
     */
    private readonly logger = new Logger(KafkaConsumerService.name);

    /**
     * Obtiene la configuración de Kafka (Docker o Confluent Cloud)
     * reutilizando exactamente la misma configuración que usa el Producer.
     */
    private readonly kafkaSettings = resolveKafkaConfig();

    /**
     * Cliente principal de Kafka.
     */
    private kafka: Kafka;

    /**
     * Consumer de KafkaJS.
     */
    private consumer: Consumer;

    /**
     * Indica si actualmente existe conexión con Kafka.
     */
    private isConnected = false;

    /**
     * Contador simple de mensajes consumidos.
     * (Opcional, pero útil para pruebas y la demo.)
     */
    private messagesConsumed = 0;

    constructor() {
        /**
         * Crear cliente Kafka usando la configuración existente.
         */
        this.kafka = new Kafka(this.kafkaSettings.kafkaConfig);

        /**
         * Crear el Consumer.
         *
         * El groupId identifica este consumidor.
         * Si en el futuro existen varias instancias del backend,
         * Kafka repartirá automáticamente las particiones.
         */
        this.consumer = this.kafka.consumer({
            groupId:
            process.env.KAFKA_CONSUMER_GROUP_ID ??
            'iot-platform-consumer',
        });
    }

    /**
     * Se ejecuta automáticamente cuando NestJS inicia.
     */
    async onModuleInit(): Promise<void> {
        try {
            await this.connect();

            /**
             * Suscribirse a los topics.
             *
             * Puedes dejar solo TELEMETRY_RECEIVED para el MVP,
             * pero ya que existen los otros topics es buena idea
             * escucharlos también.
             */
            await this.consumer.subscribe({
                topics: [
                    KAFKA_TOPICS.TELEMETRY_RECEIVED,
                    KAFKA_TOPICS.ALERT_GENERATED,
                    KAFKA_TOPICS.SENSOR_OFFLINE,
                ],
                fromBeginning: false,
            });

            this.logger.log('Kafka consumer subscribed to topics.');

            /**
             * Comenzar a escuchar mensajes.
             */
            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        /**
                         * Si por alguna razón el mensaje viene vacío,
                         * simplemente se ignora.
                         */
                        if (!message.value) {
                            this.logger.warn(
                                `Empty message received from topic ${topic}`,
                            );
                            return;
                        }

                        /**
                         * Convertir Buffer -> String -> JSON.
                         */
                        const payload = JSON.parse(message.value.toString());

                        /**
                         * Incrementar contador.
                         */
                        this.messagesConsumed++;

                        /**
                         * Registrar información útil.
                         */
                        this.logger.log(
                            [
                                'Kafka message received',
                                `Topic=${topic}`,
                                `Partition=${partition}`,
                                `Sensor=${payload.sensorId ?? 'N/A'}`,
                                `Event=${payload.eventType ?? 'N/A'}`,
                                `TotalConsumed=${this.messagesConsumed}`,
                            ].join(' | '),
                        );

                        /**
                         * Aquí podría agregarse procesamiento futuro.
                         *
                         * IMPORTANTE:
                         * NO guardar nuevamente en Mongo.
                         * NO reenviar a P09.
                         * El objetivo del MVP es únicamente demostrar
                         * que el backend consume correctamente los eventos.
                         */

                    } catch (error) {
                        this.logger.error(
                            'Error processing Kafka message',
                            error instanceof Error ? error.stack : String(error),
                        );
                    }
                },
            });

            this.logger.log('Kafka consumer is running.');
        } catch (error) {
            /**
             * Si Kafka falla al iniciar,
             * NO debe detener toda la API.
             */
            this.isConnected = false;

            this.logger.warn(
                'Kafka unavailable at startup. API will continue without consuming events.',
            );

            this.logger.error(
                error instanceof Error ? error.stack : String(error),
            );
        }
    }

    /**
     * Se ejecuta automáticamente cuando NestJS termina.
     */
    async onModuleDestroy(): Promise<void> {
        try {
            await this.consumer.disconnect();

            this.isConnected = false;

            this.logger.log('Kafka consumer disconnected.');
        } catch (error) {
            this.logger.error(
                'Error disconnecting Kafka consumer',
                error instanceof Error ? error.stack : String(error),
            );
        }
    }

    /**
     * Establece la conexión con Kafka.
     */
    private async connect(): Promise<void> {
        try {
            await this.consumer.connect();

            this.isConnected = true;

            this.logger.log(
                `Connected to Kafka (${this.kafkaSettings.mode}) at ${this.kafkaSettings.brokers[0]}`,
            );
        } catch (error) {
            this.isConnected = false;

            this.logger.error(
                'Kafka consumer connection error',
                error instanceof Error ? error.stack : String(error),
            );

            throw error;
        }
    }
}
