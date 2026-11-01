/* Service worker do restaurante: pequeno de propósito. O código de verdade vem do motor (sw-motor.js) e é atualizado junto com ele.
   Fica na pasta do site do restaurante (precisa estar na mesma origem da página). */
self.window = self;
importScripts('config-restaurante.js');
self.MOTOR = self.RESTAURANTE.motor;
importScripts(self.MOTOR + 'sw-motor.js');
