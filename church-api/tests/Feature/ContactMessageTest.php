<?php

use App\Models\ContactMessage;

it('submits a public contact message successfully', function () {
    $response = $this->postJson('/api/v1/public/contact', [
        'name' => 'Jean Dupont',
        'email' => 'jean.dupont@example.com',
        'phone' => '+22501020304',
        'subject' => 'Demande d\'information',
        'message' => 'Bonjour, je souhaiterais en savoir plus sur vos activités.',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Jean Dupont')
        ->assertJsonPath('data.status', 'pending');

    $this->assertDatabaseHas('contact_messages', [
        'name' => 'Jean Dupont',
        'email' => 'jean.dupont@example.com',
        'status' => 'pending',
    ]);
});

it('validates public contact form submission', function () {
    $this->postJson('/api/v1/public/contact', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'email', 'subject', 'message']);
});

it('lists contact messages for authorized admins', function () {
    ContactMessage::create([
        'name' => 'Message 1',
        'email' => 'msg1@example.com',
        'subject' => 'Subject 1',
        'message' => 'Body 1',
        'status' => 'pending',
    ]);
    ContactMessage::create([
        'name' => 'Message 2',
        'email' => 'msg2@example.com',
        'subject' => 'Subject 2',
        'message' => 'Body 2',
        'status' => 'pending',
    ]);

    actingAsAdminWith(['view_contacts']);

    $response = $this->getJson('/api/v1/admin/contacts')
        ->assertOk();

    expect($response->json('data'))->toHaveCount(2);
});

it('blocks unauthorized admins from listing contact messages', function () {
    actingAsAdminWith([]); // authenticated but without permission

    $this->getJson('/api/v1/admin/contacts')->assertForbidden();
});

it('allows authorized admins to update status, reply, and archive', function () {
    $message = ContactMessage::create([
        'name' => 'Message to process',
        'email' => 'proc@example.com',
        'subject' => 'Subject Proc',
        'message' => 'Body Proc',
        'status' => 'pending',
    ]);

    $admin = actingAsAdminWith(['manage_contacts']);

    // Update status
    $this->patchJson("/api/v1/admin/contacts/{$message->id}", [
        'status' => 'read',
    ])->assertOk()
        ->assertJsonPath('data.status', 'read');

    // Reply
    $this->postJson("/api/v1/admin/contacts/{$message->id}/reply")
        ->assertOk()
        ->assertJsonPath('data.status', 'read')
        ->assertJsonPath('data.replied_by', $admin->id);

    // Archive
    $this->postJson("/api/v1/admin/contacts/{$message->id}/archive")
        ->assertOk()
        ->assertJsonPath('data.status', 'archived');
});

it('blocks unauthorized admins from processing messages', function () {
    $message = ContactMessage::create([
        'name' => 'Msg',
        'email' => 'msg@example.com',
        'subject' => 'Sub',
        'message' => 'Body',
        'status' => 'pending',
    ]);

    actingAsAdminWith([]);

    $this->patchJson("/api/v1/admin/contacts/{$message->id}", ['status' => 'read'])->assertForbidden();
    $this->postJson("/api/v1/admin/contacts/{$message->id}/reply")->assertForbidden();
    $this->postJson("/api/v1/admin/contacts/{$message->id}/archive")->assertForbidden();
});
