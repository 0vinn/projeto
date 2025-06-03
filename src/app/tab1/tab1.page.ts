import { Component } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { LocalNotifications } from '@capacitor/local-notifications';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  alarmes: any[] = [];

  constructor(private alertController: AlertController, private toastController: ToastController) {
    this.pedirPermissao();
    this.carregarAlarmes();
  }

  // Pedir permissão para notificações
  async pedirPermissao() {
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display === 'granted') {
      console.log('✅ Permissão concedida para notificações');
      
      // Configurar listener para quando a notificação for tocada
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('Notificação tocada:', notification);
        const alarmeId = notification.notification.extra?.alarmeId;
        if (alarmeId) {
          this.marcarAlarmeComoTocado(alarmeId);
        }
      });
      
    } else {
      console.log('❌ Permissão negada para notificações');
      this.mostrarToast('⚠️ Ative as notificações nas configurações do celular!');
    }
  }

 // Botão principal - criar novo alarme
async criarAlarme() {
  const alert = await this.alertController.create({
    header: 'Novo Alarme',
    inputs: [
      {
        name: 'titulo',
        type: 'text',
        placeholder: 'Ex: Reunião importante',
      },
      {
        name: 'data',
        type: 'date',
        placeholder: 'Escolha a data',
        min: new Date().toISOString().slice(0, 10), // impede data passada
      },
      {
        name: 'hora',
        type: 'time',
        placeholder: 'Escolha a hora',
      }
    ],
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
      },
      {
        text: 'Criar',
       handler: (data) => {
  if (data.titulo && data.data && data.hora) {
    const dataHora = new Date(`${data.data}T${data.hora}`);
    this.salvarAlarme(data.titulo, dataHora.toISOString());
  } else {
    this.mostrarToast('Preencha todos os campos!');
  }
}
      }
    ]
  });

  await alert.present();
}

  // Salvar o alarme
  async salvarAlarme(titulo: string, dataHora: string) {
    const id = Date.now(); // ID único simples
    const dataAgendamento = new Date(dataHora);
    const agora = new Date();
    
    // Verificar se a data está no futuro
    if (dataAgendamento <= agora) {
      this.mostrarToast('❌ A data deve ser no futuro!');
      return;
    }
    
    const novoAlarme = {
      id: id,
      titulo: titulo,
      dataHora: dataHora,
      ativo: true
    };

    // Adicionar na lista
    this.alarmes.push(novoAlarme);
    
    // Salvar no celular
    localStorage.setItem('alarmes', JSON.stringify(this.alarmes));
    
    // Criar a notificação sincronizada com o relógio do celular
    try {
      await LocalNotifications.schedule({
  notifications: [{
    title: '🔔 ALARME!',
    body: `🕒 ${titulo}`,
    id: id,
    schedule: {
      at: dataAgendamento,
      allowWhileIdle: true // Funciona mesmo com app fechado
    },
    sound: 'default',
    attachments: undefined,
    actionTypeId: '',
    extra: {
      alarmeId: id
    },
    channelId: 'high_priority' // Canal com prioridade alta
  }]
});
      
      const tempoRestante = dataAgendamento.getTime() - agora.getTime();
      const minutosRestantes = Math.round(tempoRestante / (1000 * 60));
      
      console.log('Alarme agendado para:', dataAgendamento.toLocaleString());
      console.log('Tempo restante:', minutosRestantes, 'minutos');
      
      this.mostrarToast(`✅ Alarme criado! Faltam ${minutosRestantes} minutos`);
      
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
      this.mostrarToast('❌ Erro ao criar alarme. Verifique as permissões.');
    }
  }

  // Desativar alarme
  async desativarAlarme(alarme: any) {
    // Cancelar a notificação
    await LocalNotifications.cancel({ notifications: [{ id: alarme.id }] });
    
    // Marcar como desativado
    alarme.ativo = false;
    
    // Salvar mudança
    localStorage.setItem('alarmes', JSON.stringify(this.alarmes));
    
    console.log('Alarme desativado:', alarme.titulo);
  }

  // Excluir alarme
  async excluirAlarme(alarme: any) {
    // Cancelar a notificação
    await LocalNotifications.cancel({ notifications: [{ id: alarme.id }] });
    
    // Remover da lista
    this.alarmes = this.alarmes.filter(a => a.id !== alarme.id);
    
    // Salvar mudança
    localStorage.setItem('alarmes', JSON.stringify(this.alarmes));
    
    console.log('Alarme excluído:', alarme.titulo);
  }

  // Carregar alarmes salvos
  carregarAlarmes() {
    const salvo = localStorage.getItem('alarmes');
    if (salvo) {
      this.alarmes = JSON.parse(salvo);
    }
  }

  // Formatar data para mostrar bonito
  formatarData(dataHora: string): string {
    const data = new Date(dataHora);
    return data.toLocaleString('pt-BR');
  }

  // Mostrar mensagem toast
  async mostrarToast(mensagem: string) {
    const toast = await this.toastController.create({
      message: mensagem,
      duration: 3000,
      position: 'bottom'
    });
    toast.present();
  }

  // Marcar alarme como tocado quando o usuário clica na notificação
  marcarAlarmeComoTocado(alarmeId: number) {
    const alarme = this.alarmes.find(a => a.id === alarmeId);
    if (alarme) {
      alarme.ativo = false;
      localStorage.setItem('alarmes', JSON.stringify(this.alarmes));
      this.mostrarToast(`🔔 Alarme "${alarme.titulo}" foi tocado!`);
    }
  }

  // Função de teste para verificar se as notificações estão funcionando
  async testarNotificacao() {
  const agora = new Date();
  const teste = new Date(agora.getTime() + 5000); // +5 segundos

  await LocalNotifications.schedule({
    notifications: [{
      title: '🔔 TESTE DE ALARME',
      body: '🧪 Se você está vendo isso, está funcionando!',
      id: 999999,
      schedule: {
        at: teste,
        allowWhileIdle: true
      },
      sound: 'default',
      channelId: 'high_priority', // usa canal com prioridade alta
      extra: {
        teste: true
      }
    }]
  });

  this.mostrarToast('✅ Teste agendado para 5 segundos!');
  console.log('Teste agendado para:', teste.toLocaleString());
}}
